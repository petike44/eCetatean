import { Hono } from 'hono'
import { requireAuth, requireCivilServant } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { writeAuditEntry } from '../lib/hash-chain'

export const civilServantRoute = new Hono()

civilServantRoute.use('*', requireAuth, requireCivilServant)

civilServantRoute.get('/lookup', async (c) => {
  const servantId = c.get('userId')
  const cnp = c.req.query('cnp')

  if (!cnp) {
    return c.json(
      { success: false, error: 'CNP-ul este obligatoriu' },
      400
    )
  }

  const { data: citizen, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, city, language')
    .eq('cnp', cnp)
    .maybeSingle()

  if (error || !citizen) {
    return c.json({ success: false, error: 'Cetățean negăsit' }, 404)
  }

  const { data: reports } = await supabaseAdmin
    .from('civic_reports')
    .select('id, category, status, reference_number, created_at, address')
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
    action: 'lookup_by_cnp',
  })

  return c.json({
    success: true,
    data: {
      citizen: {
        name: citizen.full_name,
        city: citizen.city,
      },
      reports: reports ?? [],
      restricted_sections: [
        {
          label: 'Date medicale',
          reason: 'Acces restricționat — competență CNAS',
        },
        {
          label: 'Date financiare',
          reason: 'Acces restricționat — competență ANAF',
        },
        {
          label: 'Vehicule',
          reason: 'Acces restricționat — competență DRPCIV',
        },
        {
          label: 'Date complete de identitate',
          reason: 'Acces restricționat — CNP protejat',
        },
      ],
    },
  })
})
