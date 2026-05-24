import { Hono } from 'hono'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'

export const seedRoute = new Hono()

// ─── Mock data constants ──────────────────────────────────────────

const MOCK_USER_IDS = ['mock-user-andrei', 'mock-user-maria', 'mock-user-alex']

const MOCK_PROFILES = [
  {
    user_id: 'mock-user-andrei',
    full_name: 'Andrei Popescu',
    cnp: '1850501124567',
    city: 'Cluj-Napoca',
    language: 'ro',
    phone: '+40721111111',
    email: 'andrei.popescu@example.ro',
    address: 'Str. Avram Iancu 15, Cluj-Napoca',
    buletin_series: 'CJ',
    buletin_number: '234567',
    buletin_expiry: '2028-03-15',
  },
  {
    user_id: 'mock-user-maria',
    full_name: 'Maria Ionescu',
    cnp: '2900312124890',
    city: 'Cluj-Napoca',
    language: 'ro',
    phone: '+40722222222',
    email: 'maria.ionescu@example.ro',
    address: 'Str. Memorandumului 22, Cluj-Napoca',
    buletin_series: 'CJ',
    buletin_number: '345678',
    buletin_expiry: '2027-11-20',
  },
  {
    user_id: 'mock-user-alex',
    full_name: 'Alexandru Mureșan',
    cnp: '1780908126543',
    city: 'Cluj-Napoca',
    language: 'ro',
    phone: '+40733333333',
    email: 'alex.muresan@example.ro',
    address: 'Bd. Eroilor 30, Cluj-Napoca',
    buletin_series: 'CJ',
    buletin_number: '456789',
    buletin_expiry: '2026-06-01',
  },
]

const MOCK_VEHICLES = [
  {
    user_id: 'stub-user-citizen',
    plate_number: 'CJ-01-ABC',
    make: 'Dacia',
    model: 'Logan',
    year: 2020,
    vin: 'VF1KMD20061234567',
    fuel_type: 'benzina',
    color: 'Alb',
    itp_expiry: '2026-08-15',
    rca_expiry: '2026-04-30',
  },
  {
    user_id: 'stub-user-citizen',
    plate_number: 'CJ-99-XYZ',
    make: 'Volkswagen',
    model: 'Golf',
    year: 2018,
    vin: 'WVWZZZ1JZYW123456',
    fuel_type: 'diesel',
    color: 'Gri',
    itp_expiry: '2025-12-01',
    rca_expiry: '2026-01-15',
  },
  {
    user_id: 'mock-user-andrei',
    plate_number: 'CJ-50-BMW',
    make: 'BMW',
    model: '320d',
    year: 2019,
    vin: 'WBA8E5C55JA234567',
    fuel_type: 'diesel',
    color: 'Negru',
    itp_expiry: '2026-03-10',
    rca_expiry: '2026-08-20',
  },
]

const MOCK_LIFE_EVENTS = [
  {
    id: '11111111-0000-4000-8000-000000000001',
    user_id: 'stub-user-citizen',
    event_type: 'car_from_germany',
    event_title: 'Înmatriculare mașină din Germania/UE',
    steps_status: { step_1: 'completed', step_2: 'completed', step_3: 'pending', step_4: 'pending', step_5: 'pending', step_6: 'pending', step_7: 'pending' },
    current_step: 3,
    total_steps: 7,
    is_completed: false,
  },
  {
    id: '11111111-0000-4000-8000-000000000002',
    user_id: 'stub-user-citizen',
    event_type: 'id_renewal',
    event_title: 'Îți reînnoiești buletinul',
    steps_status: { step_1: 'completed' },
    current_step: 2,
    total_steps: 1,
    is_completed: true,
  },
  {
    id: '11111111-0000-4000-8000-000000000003',
    user_id: 'mock-user-andrei',
    event_type: 'start_business',
    event_title: 'Vrei să deschizi o firmă sau PFA',
    steps_status: { step_1: 'completed', step_2: 'pending' },
    current_step: 2,
    total_steps: 2,
    is_completed: false,
  },
  {
    id: '11111111-0000-4000-8000-000000000004',
    user_id: 'mock-user-maria',
    event_type: 'bought_car',
    event_title: 'Înmatriculare vehicul cumpărat',
    steps_status: { step_1: 'pending', step_2: 'pending', step_3: 'pending', step_4: 'pending', step_5: 'pending' },
    current_step: 1,
    total_steps: 5,
    is_completed: false,
  },
  {
    id: '11111111-0000-4000-8000-000000000005',
    user_id: 'mock-user-alex',
    event_type: 'moving_to_cluj',
    event_title: 'Te muți la Cluj pentru facultate',
    steps_status: { step_1: 'completed', step_2: 'pending', step_3: 'pending', step_4: 'pending' },
    current_step: 2,
    total_steps: 4,
    is_completed: false,
  },
]

const MOCK_REPORTS = [
  {
    user_id: 'stub-user-citizen',
    category: 'gunoi_ilegal',
    description: 'Grămadă de deșeuri menajere aruncate ilegal în spatele blocului.',
    address: 'Str. Fabricii 45, Cluj-Napoca',
    reference_number: 'CLJ-2026-1003-MOCK',
    status: 'rezolvata',
  },
  {
    user_id: 'stub-user-citizen',
    category: 'masina_abandonata',
    description: 'Mașină fără numere parcată de peste 2 luni, pare abandonată.',
    address: 'Str. Aurel Vlaicu 8, Cluj-Napoca',
    reference_number: 'CLJ-2026-1004-MOCK',
    status: 'inregistrata',
  },
  {
    user_id: 'mock-user-andrei',
    category: 'trotuar_deteriorat',
    description: 'Trotuar crăpat și ridicat de rădăcinile copacilor, pericol pentru pietoni.',
    address: 'Bd. 21 Decembrie 1989, Cluj-Napoca',
    reference_number: 'CLJ-2026-1005-MOCK',
    status: 'in_lucru',
  },
  {
    user_id: 'mock-user-maria',
    category: 'groapa_asfalt',
    description: 'Groapă adâncă de ~20cm pe carosabil, creează pericol pentru vehicule.',
    address: 'Str. Piezișă 3, Cluj-Napoca',
    reference_number: 'CLJ-2026-1006-MOCK',
    status: 'inregistrata',
  },
  {
    user_id: 'mock-user-alex',
    category: 'iluminat_defect',
    description: 'Trei stâlpi consecutivi cu becul ars, zona neilluminată noaptea.',
    address: 'Str. George Barițiu 12, Cluj-Napoca',
    reference_number: 'CLJ-2026-1007-MOCK',
    status: 'in_lucru',
  },
]

const MOCK_NEWS = [
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    title: 'Ghișee online DRPCIV — extindere servicii',
    summary: 'Din iunie, transcrierea vehiculelor second-hand se poate face integral online prin portalul DRPCIV, fără prezentare fizică.',
    published_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    title: 'Impozite locale 2026 — termen 31 martie',
    summary: 'Primăria Cluj-Napoca reamintește că impozitul pe clădiri și pe mijloace de transport trebuie achitat până pe 31 martie pentru a beneficia de bonificația de 10%.',
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    title: 'Certificat fiscal — eliberare în 24h prin SPV',
    summary: 'ANAF anunță că certificatele fiscale solicitate prin Spațiul Privat Virtual vor fi emise în maximum 24 de ore lucrătoare.',
    published_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    title: 'Buletine electronice — program special mai–iunie',
    summary: 'DGEP Cluj extinde programul cu publicul în weekendul 7–8 iunie pentru eliberarea cărților de identitate electronice.',
    published_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
]

// ─── GET /api/seed/stats ──────────────────────────────────────────

seedRoute.get('/stats', async (c) => {
  if (!isSupabaseConfigured) {
    return c.json({ success: false, error: 'Supabase not configured' }, 503)
  }

  const tables = ['profiles', 'life_event_progress', 'civic_reports', 'news', 'vehicles'] as const
  const counts: Record<string, number> = {}

  await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
      counts[table] = count ?? 0
    })
  )

  return c.json({ success: true, data: counts })
})

// ─── POST /api/seed/insert ────────────────────────────────────────

seedRoute.post('/insert', async (c) => {
  if (!isSupabaseConfigured) {
    return c.json({ success: false, error: 'Supabase not configured' }, 503)
  }

  const errors: string[] = []

  // Profiles
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert(MOCK_PROFILES, { onConflict: 'user_id' })
  if (profileErr) errors.push(`profiles: ${profileErr.message}`)

  // Vehicles — delete existing mock plates first to avoid duplicates
  await supabaseAdmin.from('vehicles').delete().in('plate_number', ['CJ-01-ABC', 'CJ-99-XYZ', 'CJ-50-BMW'])
  const { error: vehicleErr } = await supabaseAdmin.from('vehicles').insert(MOCK_VEHICLES)
  if (vehicleErr) errors.push(`vehicles: ${vehicleErr.message}`)

  // Life events
  const { error: leErr } = await supabaseAdmin
    .from('life_event_progress')
    .upsert(MOCK_LIFE_EVENTS, { onConflict: 'id' })
  if (leErr) errors.push(`life_event_progress: ${leErr.message}`)

  // Civic reports
  const { error: reportErr } = await supabaseAdmin
    .from('civic_reports')
    .upsert(MOCK_REPORTS, { onConflict: 'reference_number' })
  if (reportErr) errors.push(`civic_reports: ${reportErr.message}`)

  // News
  const { error: newsErr } = await supabaseAdmin
    .from('news')
    .upsert(MOCK_NEWS, { onConflict: 'id' })
  if (newsErr) errors.push(`news: ${newsErr.message}`)

  if (errors.length > 0) {
    return c.json({ success: false, errors }, 500)
  }

  return c.json({ success: true, message: 'Date mock inserate cu succes.' })
})

// ─── POST /api/seed/reset ─────────────────────────────────────────

seedRoute.post('/reset', async (c) => {
  if (!isSupabaseConfigured) {
    return c.json({ success: false, error: 'Supabase not configured' }, 503)
  }

  const errors: string[] = []

  // Delete mock profiles (cascades nothing — delete dependents first)
  const { error: leErr } = await supabaseAdmin
    .from('life_event_progress')
    .delete()
    .in('user_id', [...MOCK_USER_IDS, 'stub-user-citizen'])
    .in('id', MOCK_LIFE_EVENTS.map((e) => e.id))
  if (leErr) errors.push(`life_event_progress: ${leErr.message}`)

  const { error: vehicleErr } = await supabaseAdmin
    .from('vehicles')
    .delete()
    .in('plate_number', ['CJ-01-ABC', 'CJ-99-XYZ', 'CJ-50-BMW'])
  if (vehicleErr) errors.push(`vehicles: ${vehicleErr.message}`)

  const { error: reportErr } = await supabaseAdmin
    .from('civic_reports')
    .delete()
    .in('reference_number', MOCK_REPORTS.map((r) => r.reference_number))
  if (reportErr) errors.push(`civic_reports: ${reportErr.message}`)

  const { error: newsErr } = await supabaseAdmin
    .from('news')
    .delete()
    .in('id', MOCK_NEWS.map((n) => n.id))
  if (newsErr) errors.push(`news: ${newsErr.message}`)

  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .delete()
    .in('user_id', MOCK_USER_IDS)
  if (profileErr) errors.push(`profiles: ${profileErr.message}`)

  if (errors.length > 0) {
    return c.json({ success: false, errors }, 500)
  }

  return c.json({ success: true, message: 'Date mock șterse cu succes.' })
})
