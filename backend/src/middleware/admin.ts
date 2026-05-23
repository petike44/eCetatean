import { createMiddleware } from 'hono/factory'
import { verifySupabaseJWT } from '../lib/supabase-jwt'
import { isAdminEmail, isAdminPayload, isAdminStub } from '../lib/admin'

export const requireAdmin = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ') && process.env.SUPABASE_JWT_SECRET) {
    try {
      const token = authHeader.replace('Bearer ', '')
      const payload = await verifySupabaseJWT(token)
      if (isAdminPayload(payload)) {
        c.set('userId', payload.sub)
        c.set('userRole', payload.role ?? 'citizen')
        c.set('clerkPayload', payload)
        await next()
        return
      }
    } catch {
      // fall through to stub / deny
    }
  }

  if (isAdminStub()) {
    await next()
    return
  }

  const payload = c.get('clerkPayload')
  if (isAdminPayload(payload) || isAdminEmail(payload?.email)) {
    await next()
    return
  }

  return c.json(
    { success: false, error: 'Acces restricționat administratorilor' },
    403
  )
})
