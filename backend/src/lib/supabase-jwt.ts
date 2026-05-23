import { jwtVerify } from 'jose'
import type { ClerkPayload } from '../types'

export async function verifySupabaseJWT(token: string): Promise<ClerkPayload> {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
  try {
    const { payload } = await jwtVerify(token, secret, { audience: 'authenticated' })
    const appMeta = payload.app_metadata as Record<string, unknown> | undefined
    return {
      sub: payload.sub!,
      email: payload.email as string | undefined,
      role: (appMeta?.app_role as 'citizen' | 'civil_servant' | undefined) ?? 'citizen',
      exp: payload.exp ?? 0,
      iat: payload.iat ?? 0,
    }
  } catch {
    throw new Error('Token Supabase invalid')
  }
}
