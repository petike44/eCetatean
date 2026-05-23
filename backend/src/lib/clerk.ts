import { createClerkClient, verifyToken } from '@clerk/backend'
import type { ClerkPayload } from '../types'

// Lazily construct the Clerk client so a missing CLERK_SECRET_KEY
// (e.g. when running with AUTH_STUB=true) never crashes boot.
let _clerkClient: ReturnType<typeof createClerkClient> | null = null
function getClerkClient() {
  if (!_clerkClient) {
    _clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
  }
  return _clerkClient
}

export async function verifyClerkJWT(token: string): Promise<ClerkPayload> {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    return {
      sub: payload.sub,
      email: (payload as Record<string, unknown>).email as string | undefined,
      role: (payload as Record<string, unknown>).role as
        | 'citizen'
        | 'civil_servant'
        | undefined,
      exp: payload.exp ?? 0,
      iat: payload.iat ?? 0,
    }
  } catch (err) {
    throw new Error('Token Clerk invalid')
  }
}

export { getClerkClient }
