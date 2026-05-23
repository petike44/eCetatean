import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { verifyHashChain } from '../lib/hash-chain';
export const auditRoute = new Hono();
auditRoute.get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
    const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) {
        return c.json({ success: false, error: 'Eroare la preluarea registrului' }, 500);
    }
    const reversed = [...(data ?? [])].reverse();
    const isValid = verifyHashChain(reversed);
    return c.json({
        success: true,
        data: {
            entries: data,
            chain_valid: isValid,
            total: data?.length ?? 0,
        },
    });
});
auditRoute.get('/verify', requireAuth, async (c) => {
    const userId = c.get('userId');
    const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select('data_hash, previous_hash, record_hash')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) {
        return c.json({ success: false, error: 'Eroare la verificare' }, 500);
    }
    const isValid = verifyHashChain(data ?? []);
    return c.json({
        success: true,
        data: {
            chain_valid: isValid,
            entries_checked: data?.length ?? 0,
            message: isValid
                ? 'Lanțul de hashuri este intact. Datele nu au fost modificate.'
                : '⚠️ Inconsistență detectată în lanțul de hashuri.',
        },
    });
});
