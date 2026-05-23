import type { ClerkPayload } from '../types'

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@ecetatean.ro'

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  if (normalized === ADMIN_EMAIL) return true
  const extra = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) ?? []
  return extra.includes(normalized)
}

export function isAdminPayload(payload: ClerkPayload | undefined): boolean {
  if (!payload) return false
  if (isAdminEmail(payload.email)) return true
  return payload.role === 'admin'
}

export function isAdminStub(): boolean {
  return (
    process.env.AUTH_STUB === 'true' &&
    (process.env.AUTH_STUB_ROLE === 'admin' ||
      process.env.AUTH_STUB_USER_ID === 'stub-user-admin')
  )
}
