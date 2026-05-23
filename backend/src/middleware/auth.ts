import { createMiddleware } from 'hono/factory'
import { verifyClerkJWT } from '../lib/clerk'
import type { ClerkPayload } from '../types'

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    userRole: 'citizen' | 'civil_servant'
    clerkPayload: ClerkPayload
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Token de autentificare lipsă' },
      401
    )
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = await verifyClerkJWT(token)
    c.set('userId', payload.sub)
    c.set('userRole', (payload.role as 'citizen' | 'civil_servant') || 'citizen')
    c.set('clerkPayload', payload)
    await next()
  } catch (err) {
    console.error('Auth error:', err)
    return c.json({ success: false, error: 'Token invalid sau expirat' }, 401)
  }
})

export const requireCivilServant = createMiddleware(async (c, next) => {
  const role = c.get('userRole')
  if (role !== 'civil_servant') {
    return c.json(
      { success: false, error: 'Acces restricționat funcționarilor publici' },
      403
    )
  }
  await next()
})
