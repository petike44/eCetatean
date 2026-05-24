import { describe, it, expect, beforeEach } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import {
  DriveCredentialsMissingError,
  fetchDrivePdf,
  normalisePem,
  type TokenCache,
} from './drive-proxy'

function genTestKey(): { privateKey: string } {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  return { privateKey }
}

describe('normalisePem', () => {
  it('passes through PEMs with literal newlines', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----'
    expect(normalisePem(pem)).toBe(pem)
  })
  it('un-escapes \\n sequences when no real newlines are present', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----'
    expect(normalisePem(pem)).toBe(
      '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----'
    )
  })
  it('strips surrounding quotes', () => {
    expect(normalisePem('"abc"')).toBe('abc')
    expect(normalisePem("'abc'")).toBe('abc')
  })
})

describe('fetchDrivePdf — env gate', () => {
  beforeEach(() => {
    delete process.env.GDRIVE_SA_EMAIL
    delete process.env.GDRIVE_SA_PRIVATE_KEY
  })

  it('throws DriveCredentialsMissingError when env is unset', async () => {
    await expect(fetchDrivePdf('any-id')).rejects.toBeInstanceOf(DriveCredentialsMissingError)
  })

  it('throws DriveCredentialsMissingError when only one of email/key is set', async () => {
    process.env.GDRIVE_SA_EMAIL = 'sa@example.iam.gserviceaccount.com'
    await expect(fetchDrivePdf('any-id')).rejects.toBeInstanceOf(DriveCredentialsMissingError)
  })
})

describe('fetchDrivePdf — happy path with mocks', () => {
  it('mints a JWT, exchanges for a token, then downloads with Bearer auth', async () => {
    const { privateKey } = genTestKey()
    const calls: { url: string; init?: RequestInit }[] = []
    const fakeFetcher: typeof fetch = async (input, init) => {
      const url = String(input)
      calls.push({ url, init })
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(
          JSON.stringify({ access_token: 'tk-1', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.includes('/drive/v3/files/')) {
        return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        })
      }
      throw new Error(`unexpected url ${url}`)
    }

    const out = await fetchDrivePdf('drv-abc', {
      email: 'sa@example.iam.gserviceaccount.com',
      privateKey,
      fetcher: fakeFetcher,
    })
    expect(Array.from(out.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]) // %PDF
    expect(calls).toHaveLength(2)
    expect(calls[0].url).toBe('https://oauth2.googleapis.com/token')
    expect(calls[1].url).toBe(
      'https://www.googleapis.com/drive/v3/files/drv-abc?alt=media'
    )
    const authHeader = (calls[1].init?.headers as Record<string, string>).Authorization
    expect(authHeader).toBe('Bearer tk-1')
  })

  it('reuses a cached token across calls', async () => {
    const { privateKey } = genTestKey()
    const cache: TokenCache = { token: null, expiresAt: 0 }
    let tokenCalls = 0
    let downloadCalls = 0
    const fakeFetcher: typeof fetch = async (input) => {
      const url = String(input)
      if (url === 'https://oauth2.googleapis.com/token') {
        tokenCalls++
        return new Response(
          JSON.stringify({ access_token: 'tk-reused', expires_in: 3600 }),
          { status: 200 }
        )
      }
      downloadCalls++
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 })
    }

    const opts = {
      email: 'sa@example.iam.gserviceaccount.com',
      privateKey,
      fetcher: fakeFetcher,
      tokenCache: cache,
    }
    await fetchDrivePdf('a', opts)
    await fetchDrivePdf('b', opts)
    expect(tokenCalls).toBe(1)
    expect(downloadCalls).toBe(2)
    expect(cache.token).toBe('tk-reused')
  })

  it('surfaces token-exchange failure messages', async () => {
    const { privateKey } = genTestKey()
    const fakeFetcher: typeof fetch = async () =>
      new Response('invalid_grant', { status: 400, statusText: 'Bad Request' })

    await expect(
      fetchDrivePdf('drv-x', {
        email: 'sa@example.iam.gserviceaccount.com',
        privateKey,
        fetcher: fakeFetcher,
      })
    ).rejects.toThrow(/Drive token exchange failed.*400.*invalid_grant/)
  })

  it('surfaces drive download failure messages', async () => {
    const { privateKey } = genTestKey()
    const fakeFetcher: typeof fetch = async (input) => {
      const url = String(input)
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(JSON.stringify({ access_token: 'tk', expires_in: 3600 }), {
          status: 200,
        })
      }
      return new Response('not found', { status: 404, statusText: 'Not Found' })
    }

    await expect(
      fetchDrivePdf('missing-id', {
        email: 'sa@example.iam.gserviceaccount.com',
        privateKey,
        fetcher: fakeFetcher,
      })
    ).rejects.toThrow(/Drive GET missing-id failed.*404/)
  })
})
