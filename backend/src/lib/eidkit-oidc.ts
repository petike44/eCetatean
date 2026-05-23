import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { randomBytes } from 'crypto'
import type { EidKitClaims } from '../types'

export interface EidKitConfig {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  configured: boolean
  demoEnabled: boolean
}

interface OidcDiscovery {
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  issuer: string
}

export interface EidKitTokenSet {
  idToken: string
  accessToken?: string
  tokenType?: string
  expiresIn?: number
  claims: EidKitClaims
}

let discoveryCache: OidcDiscovery | null = null

export function getEidKitConfig(): EidKitConfig {
  const issuer = (process.env.EIDKIT_ISSUER || 'https://idp.eidkit.ro').replace(/\/$/, '')
  const clientId = process.env.EIDKIT_CLIENT_ID || ''
  const clientSecret = process.env.EIDKIT_CLIENT_SECRET || ''
  const redirectUri =
    process.env.EIDKIT_REDIRECT_URI || 'http://localhost:3001/api/eidkit/callback'
  const scopes = (process.env.EIDKIT_SCOPES || 'openid profile address cei:cnp cei:document')
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean)

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    configured: Boolean(clientId && clientSecret && redirectUri),
    demoEnabled: process.env.EIDKIT_ENABLE_DEMO !== 'false',
  }
}

export function randomUrlToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export async function getDiscovery(config = getEidKitConfig()): Promise<OidcDiscovery> {
  if (discoveryCache?.issuer === config.issuer) return discoveryCache

  const response = await fetch(`${config.issuer}/.well-known/openid-configuration`)
  if (!response.ok) {
    throw new Error(`EidKit discovery failed (${response.status})`)
  }

  const discovery = (await response.json()) as OidcDiscovery
  discoveryCache = discovery
  return discovery
}

export async function buildAuthorizationUrl(params: {
  state: string
  nonce: string
  config?: EidKitConfig
}): Promise<string> {
  const config = params.config ?? getEidKitConfig()
  if (!config.configured) {
    throw new Error('EidKit is not configured')
  }

  const discovery = await getDiscovery(config)
  const url = new URL(discovery.authorization_endpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', config.scopes.join(' '))
  url.searchParams.set('state', params.state)
  url.searchParams.set('nonce', params.nonce)
  return url.toString()
}

export async function exchangeCodeForTokens(params: {
  code: string
  expectedNonce: string
  config?: EidKitConfig
}): Promise<EidKitTokenSet> {
  const config = params.config ?? getEidKitConfig()
  if (!config.configured) {
    throw new Error('EidKit is not configured')
  }

  const discovery = await getDiscovery(config)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`EidKit token exchange failed (${response.status}): ${text}`)
  }

  const tokenResponse = (await response.json()) as {
    id_token?: string
    access_token?: string
    token_type?: string
    expires_in?: number
  }

  if (!tokenResponse.id_token) {
    throw new Error('EidKit token response did not include an id_token')
  }

  const claims = await verifyIdToken(tokenResponse.id_token, params.expectedNonce, config)

  return {
    idToken: tokenResponse.id_token,
    accessToken: tokenResponse.access_token,
    tokenType: tokenResponse.token_type,
    expiresIn: tokenResponse.expires_in,
    claims,
  }
}

async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
  config: EidKitConfig
): Promise<EidKitClaims> {
  const discovery = await getDiscovery(config)
  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri))
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: discovery.issuer || config.issuer,
    audience: config.clientId,
  })

  if (payload.nonce !== expectedNonce) {
    throw new Error('EidKit nonce mismatch')
  }

  return payloadToClaims(payload)
}

function payloadToClaims(payload: JWTPayload): EidKitClaims {
  return payload as EidKitClaims
}

export function normalizeEidKitClaims(claims: EidKitClaims): {
  full_name: string | null
  cnp: string | null
  date_of_birth: string | null
  address: string | null
  buletin_series: string | null
  buletin_number: string | null
  buletin_expiry: string | null
} {
  const document = claims.cei_document ?? claims.document
  const cnp =
    asString(claims.cnp) ??
    asString(claims.cei_cnp) ??
    asString(claims['cei:cnp']) ??
    null

  return {
    full_name: asString(claims.name) ?? joinName(claims.given_name, claims.family_name),
    cnp,
    date_of_birth: asString(claims.birthdate),
    address: claims.address?.formatted ?? asString(claims['address.formatted']),
    buletin_series: asString(document?.series),
    buletin_number: asString(document?.number),
    buletin_expiry:
      asString(document?.expiry_date) ??
      asString(document?.expires_at),
  }
}

export function safeClaimsForStorage(claims: EidKitClaims): Record<string, unknown> {
  const allowedKeys = [
    'sub',
    'name',
    'given_name',
    'family_name',
    'birthdate',
    'address',
    'cnp',
    'cei_cnp',
    'document',
    'cei_document',
    'iss',
    'aud',
    'exp',
    'iat',
    'scope',
  ]

  return Object.fromEntries(
    allowedKeys
      .filter((key) => claims[key] !== undefined)
      .map((key) => [key, claims[key]])
  )
}

export function tokenExpiryToIso(exp: unknown): string | null {
  if (typeof exp !== 'number') return null
  return new Date(exp * 1000).toISOString()
}

function joinName(givenName?: string, familyName?: string): string | null {
  return [givenName, familyName].filter(Boolean).join(' ').trim() || null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
