// Google Drive proxy for tipizatul PDF binaries.
// Uses a service account (drive.readonly) — rate-limit-safer than a
// bare API key even though the upstream files are publicly shared.
//
// Flow:
//   1. Build a JWT { iss: SA email, scope: drive.readonly, aud: token endpoint }
//   2. Sign RS256 with the SA private key
//   3. POST the assertion to oauth2.googleapis.com/token → access_token
//   4. GET drive/v3/files/{id}?alt=media with Authorization: Bearer <token>
//
// All network is fetcher-injectable for tests.

import { importPKCS8, SignJWT } from 'jose'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files'

export interface DriveProxyOptions {
  /** SA client_email. Defaults to env GDRIVE_SA_EMAIL. */
  email?: string
  /** SA private key (PEM). Literal newlines OR \\n escapes both accepted.
   *  Defaults to env GDRIVE_SA_PRIVATE_KEY. */
  privateKey?: string
  /** Override the HTTP fetcher (tests). */
  fetcher?: typeof fetch
  /** Cache an access token across calls in this session. */
  tokenCache?: TokenCache
}

export interface TokenCache {
  token: string | null
  expiresAt: number // epoch ms
}

export class DriveCredentialsMissingError extends Error {
  constructor() {
    super(
      'GDRIVE_SA_EMAIL and GDRIVE_SA_PRIVATE_KEY must be set to fetch tipizatul PDFs. ' +
        'See backend/.env.example — Phase 3 setup.'
    )
    this.name = 'DriveCredentialsMissingError'
  }
}

interface ResolvedCreds {
  email: string
  privateKeyPem: string
}

function resolveCreds(opts: DriveProxyOptions): ResolvedCreds {
  const email = opts.email ?? process.env.GDRIVE_SA_EMAIL
  const rawKey = opts.privateKey ?? process.env.GDRIVE_SA_PRIVATE_KEY
  if (!email || !rawKey) throw new DriveCredentialsMissingError()
  return { email, privateKeyPem: normalisePem(rawKey) }
}

/** Accept PEMs supplied in either form:
 *   - literal newlines preserved (typical for a multi-line .env value)
 *   - "\n" escape sequences (typical when the key was JSON-stringified)
 *  Returns a clean PEM with real newlines. */
export function normalisePem(input: string): string {
  let pem = input.trim()
  // Strip surrounding quotes if present (some .env loaders keep them).
  if ((pem.startsWith('"') && pem.endsWith('"')) || (pem.startsWith("'") && pem.endsWith("'"))) {
    pem = pem.slice(1, -1)
  }
  if (pem.includes('\\n') && !pem.includes('\n')) {
    pem = pem.replace(/\\n/g, '\n')
  }
  return pem
}

async function mintAccessToken(
  creds: ResolvedCreds,
  fetcher: typeof fetch
): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(creds.privateKeyPem, 'RS256')
  const assertion = await new SignJWT({ scope: DRIVE_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(creds.email)
    .setSubject(creds.email)
    .setAudience(TOKEN_ENDPOINT)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const res = await fetcher(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Drive token exchange failed: ${res.status} ${res.statusText} ${text}`)
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Drive token exchange returned no access_token')
  const expiresAt = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000 // 1min safety buffer
  return { token: json.access_token, expiresAt }
}

async function getAccessToken(
  creds: ResolvedCreds,
  fetcher: typeof fetch,
  cache?: TokenCache
): Promise<string> {
  if (cache?.token && cache.expiresAt > Date.now()) return cache.token
  const fresh = await mintAccessToken(creds, fetcher)
  if (cache) {
    cache.token = fresh.token
    cache.expiresAt = fresh.expiresAt
  }
  return fresh.token
}

/** Download a single Drive file by id. Returns its raw bytes.
 *  Throws DriveCredentialsMissingError if env is unset (caller can decide
 *  to fall back to the placeholder PDF rather than 500). */
export async function fetchDrivePdf(
  driveFileId: string,
  opts: DriveProxyOptions = {}
): Promise<Uint8Array> {
  const creds = resolveCreds(opts)
  const fetcher = opts.fetcher ?? fetch
  const token = await getAccessToken(creds, fetcher, opts.tokenCache)

  const url = `${DRIVE_API_BASE}/${encodeURIComponent(driveFileId)}?alt=media`
  const res = await fetcher(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Drive GET ${driveFileId} failed: ${res.status} ${res.statusText} ${text}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

/** Shared per-process token cache. Safe to import + reuse. */
export const sharedTokenCache: TokenCache = { token: null, expiresAt: 0 }
