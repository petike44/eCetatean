import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../types'

export const profileRoute = new Hono()

profileRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: null })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'full_name, cnp, date_of_birth, address, city, email, phone, buletin_series, buletin_number, buletin_expiry'
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return c.json({ success: false, error: 'Eroare la citirea profilului' }, 500)
  }

  return c.json({ success: true, data: data ?? null })
})

profileRoute.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: Partial<Profile>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: body })
  }

  const row = {
    user_id: userId,
    full_name: body.full_name ?? null,
    cnp: body.cnp ?? null,
    date_of_birth: body.date_of_birth ?? null,
    address: body.address ?? null,
    city: body.city ?? 'Cluj-Napoca',
    email: body.email ?? null,
    phone: body.phone ?? null,
    buletin_series: body.buletin_series ?? null,
    buletin_number: body.buletin_number ?? null,
    buletin_expiry: body.buletin_expiry ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select(
      'full_name, cnp, date_of_birth, address, city, email, phone, buletin_series, buletin_number, buletin_expiry'
    )
    .single()

  if (error) {
    console.error('profile upsert error:', error.message)
    return c.json({ success: false, error: 'Eroare la salvarea profilului' }, 500)
  }

  return c.json({ success: true, data })
})
