import { Hono } from 'hono';
import { isGeminiConfigured } from '../lib/gemini-claudia';
import { supabaseAdmin } from '../lib/supabase';
export const healthRoute = new Hono();
healthRoute.get('/', async (c) => {
    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .select('count')
            .limit(1);
        return c.json({
            success: true,
            data: {
                status: 'healthy',
                app: 'eCetățean API',
                database: error ? 'error' : 'connected',
                claudia: isGeminiConfigured() ? 'gemini' : 'stub',
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch {
        return c.json({ success: false, error: 'Health check failed' }, 500);
    }
});
