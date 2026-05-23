import { createClerkClient, verifyToken } from '@clerk/backend'
import type { ClerkPayload } from '../types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

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

export { clerkClient }
