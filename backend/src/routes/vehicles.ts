import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'

export const vehiclesRoute = new Hono()

vehiclesRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('id, plate_number, make, model, year, vin, fuel_type, engine_cc, color')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ success: false, error: 'Eroare la citirea vehiculelor' }, 500)
  }

  return c.json({ success: true, data: data ?? [] })
})
