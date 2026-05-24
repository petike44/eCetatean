import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'

export const vehiclesRoute = new Hono()

const SELECT_FIELDS =
  'id, plate_number, make, model, year, vin, fuel_type, engine_cc, color, itp_expiry, rca_expiry, created_at'

vehiclesRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ success: false, error: 'Eroare la citirea vehiculelor' }, 500)
  }

  return c.json({ success: true, data: data ?? [] })
})

vehiclesRoute.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  if (!body.plate_number) {
    return c.json({ success: false, error: 'Numărul de înmatriculare este obligatoriu' }, 400)
  }

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: { id: 'mock', ...body, user_id: userId } })
  }

  const row = {
    user_id: userId,
    plate_number: body.plate_number as string,
    make: (body.make as string) || null,
    model: (body.model as string) || null,
    year: body.year ? Number(body.year) : null,
    vin: (body.vin as string) || null,
    fuel_type: (body.fuel_type as string) || null,
    engine_cc: body.engine_cc ? Number(body.engine_cc) : null,
    color: (body.color as string) || null,
    itp_expiry: (body.itp_expiry as string) || null,
    rca_expiry: (body.rca_expiry as string) || null,
  }

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .insert(row)
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    return c.json({ success: false, error: error.message }, 500)
  }

  return c.json({ success: true, data }, 201)
})

vehiclesRoute.patch('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: { id, ...body } })
  }

  const updates: Record<string, unknown> = {}
  const allowed = ['plate_number', 'make', 'model', 'year', 'vin', 'fuel_type', 'engine_cc', 'color', 'itp_expiry', 'rca_expiry']
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key] === '' ? null : body[key]
    }
  }

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    return c.json({ success: false, error: error.message }, 500)
  }

  return c.json({ success: true, data })
})

vehiclesRoute.delete('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  if (!isSupabaseConfigured) {
    return c.json({ success: true })
  }

  const { error } = await supabaseAdmin
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return c.json({ success: false, error: error.message }, 500)
  }

  return c.json({ success: true })
})
