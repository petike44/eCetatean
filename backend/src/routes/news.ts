import { Hono } from 'hono'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'

export const newsRoute = new Hono()

newsRoute.get('/', async (c) => {
  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('news')
    .select('id, title, summary, body, published_at, created_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('news fetch error:', error.message)
    return c.json({ success: false, error: 'Eroare la preluarea știrilor' }, 500)
  }

  return c.json({ success: true, data: data ?? [] })
})
