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
  // —— Local auth stub ————————————————————————————————————————
  // When AUTH_STUB=true, skip Clerk JWT verification and inject a
  // fake signed-in user. For LOCAL TESTING ONLY — never enable in
  // production. Set the role with AUTH_STUB_ROLE (citizen | civil_servant).
  if (process.env.AUTH_STUB === 'true') {
    const role =
      (process.env.AUTH_STUB_ROLE as 'citizen' | 'civil_servant') || 'citizen'
    const userId = process.env.AUTH_STUB_USER_ID || 'stub-user-citizen'
    c.set('userId', userId)
    c.set('userRole', role)
    c.set('clerkPayload', {
      sub: userId,
      email: 'demo@ecetatean.ro',
      role,
      exp: 0,
      iat: 0,
    })
    return next()
  }

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
