import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase'

export const healthRoute = new Hono()

healthRoute.get('/', async (c) => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1)
    return c.json({
      success: true,
      data: {
        status: 'healthy',
        app: 'eCetățean API',
        database: error ? 'error' : 'connected',
        claudia: 'stub — add Anthropic SDK manually',
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
    return c.json({ success: false, error: 'Health check failed' }, 500)
  }
})
