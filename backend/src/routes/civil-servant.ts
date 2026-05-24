import { Hono } from 'hono'
import { requireAuth, requireCivilServant } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { writeAuditEntry } from '../lib/hash-chain'

export const civilServantRoute = new Hono()

civilServantRoute.use('*', requireAuth, requireCivilServant)

function maskCnp(cnp: string): string {
  if (cnp.length < 5) return cnp
  return `${cnp.slice(0, 3)}****${cnp.slice(-4)}`
}

// GET /api/civil-servant/lookup?q=<cnp_or_name>
civilServantRoute.get('/lookup', async (c) => {
  const servantId = c.get('userId')
  const q = c.req.query('q')?.trim()

  if (!q || q.length < 2) {
    return c.json({ success: false, error: 'Introduceți cel puțin 2 caractere' }, 400)
  }

  const isCnp = /^\d+$/.test(q)

  let citizen: { user_id: string; full_name: string | null; city: string | null; language: string | null; cnp: string | null } | null = null

  if (isCnp) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, city, language, cnp')
      .eq('cnp', q)
      .maybeSingle()
    if (!error) citizen = data
  } else {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, city, language, cnp')
      .ilike('full_name', `%${q}%`)
      .limit(1)
      .maybeSingle()
    if (!error) citizen = data
  }

  if (!citizen) {
    return c.json({ success: false, error: 'Cetățean negăsit' }, 404)
  }

  const { data: reports } = await supabaseAdmin
    .from('civic_reports')
    .select('id, category, status, reference_number, created_at, address, description')
    .eq('user_id', citizen.user_id)
    .order('created_at', { ascending: false })
    .limit(10)

  writeAuditEntry({
    userId: servantId,
    action: 'Funcționar: acces dosar cetățean (CNP mascat)',
    actionType: 'civil_servant_access',
    data: { accessed_city: citizen.city },
  })

  await supabaseAdmin.from('civil_servant_access_log').insert({
    servant_user_id: servantId,
    accessed_citizen_id: citizen.user_id,
    action: isCnp ? 'lookup_by_cnp' : 'lookup_by_name',
  })

  return c.json({
    success: true,
    data: {
      citizen: {
        name: citizen.full_name,
        city: citizen.city,
        cnpMasked: citizen.cnp ? maskCnp(citizen.cnp) : null,
      },
      reports: reports ?? [],
      restricted_sections: [
        { label: 'Date medicale', reason: 'Acces restricționat — competență CNAS' },
        { label: 'Date financiare', reason: 'Acces restricționat — competență ANAF' },
        { label: 'Vehicule', reason: 'Acces restricționat — competență DRPCIV' },
        { label: 'Date complete de identitate', reason: 'Acces restricționat — CNP protejat' },
      ],
    },
  })
})

// PATCH /api/civil-servant/reports/:id/status
civilServantRoute.patch('/reports/:id/status', async (c) => {
  const servantId = c.get('userId')
  const reportId = c.req.param('id')
  const body = await c.req.json<{ status: string; note?: string }>()
  const { status, note } = body

  const allowed = ['inregistrata', 'in_lucru', 'rezolvata', 'respinsa']
  if (!allowed.includes(status)) {
    return c.json({ success: false, error: 'Status invalid' }, 400)
  }

  const { data, error } = await supabaseAdmin
    .from('civic_reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .maybeSingle()

  if (error || !data) {
    return c.json({ success: false, error: 'Nu s-a putut actualiza raportul' }, 500)
  }

  writeAuditEntry({
    userId: servantId,
    action: `Funcționar: status raport actualizat → ${status}`,
    actionType: 'civil_servant_access',
    data: { report_id: reportId, new_status: status, note: note ?? null },
  })

  return c.json({ success: true, data })
})
