import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { writeAuditEntry } from '../lib/hash-chain'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, Vehicle } from '../types'

type TranslationPackage = 'Economy' | 'Optimal' | 'Premium'

type DocumentSummary = {
  name: string
  size: number
  type: string
}

type WeTranslateHandoff = {
  provider: 'wetranslate'
  mode: 'partner_api' | 'public_form_fallback'
  redirect_url: string
  handoff_id: string
  missing_fields: string[]
  payload_preview: {
    service: string
    source_language: string
    target_language: string
    package: TranslationPackage
    delivery_method: string
    customer: {
      name: string | null
      email: string | null
      phone: string | null
      address: string | null
    }
    documents: DocumentSummary[]
    vehicle?: {
      make: string | null
      model: string | null
      vin: string | null
      plate_number: string | null
    } | null
  }
}

type GhiseulDrpcivTaxType = 'certificat_inmatriculare' | 'permis_conducere' | 'autorizatie_provizorie'

type GhiseulDrpcivPaymentHandoff = {
  provider: 'ghiseul_drpciv'
  mode: 'partner_api' | 'public_form_fallback'
  redirect_url: string
  handoff_id: string
  missing_fields: string[]
  payload_preview: {
    institution: 'RAAPPS'
    person_type: 'Persoană fizică'
    tax_type: string
    amount_ron: number
    payer_cnp: string | null
    beneficiary_cnp: string | null
    beneficiary_name: string | null
    email: string | null
    confirm_email: string | null
    captcha_required: true
  }
}

type LibreTranslateDemoResult = {
  provider: 'libretranslate_demo'
  mode: 'libretranslate_api' | 'offline_demo_fallback'
  source: string
  target: string
  format: 'text' | 'html'
  alternatives: number
  translated_text: string
  detected_language?: {
    confidence?: number
    language?: string
  }
  alternative_translations?: string[]
  endpoint_used: string | null
}

const WETRANSLATE_PUBLIC_FORM_URL = 'https://www.wetranslate.ro/oferta/?page=49_1'
const GHISEUL_DRPCIV_TAX_URL =
  'https://www.ghiseul.ro/ghiseul/public/taxe/taxe-speciale/id/eyJpZEluc3QiOiA3MjExLCAidGlwUGVycyI6MCwgInZhbGlkYXJpIjogImZhbHNlIiwgInRpdGx1IjogIlBlcm1pc2UgYXV0by8gQ2VydGlmaWNhdGUgZGUgw65ubWF0cmljdWxhcmUvIEF1dG9yaXphyJtpZSBwcm92aXpvcmllIn0%3D'
const GHISEUL_DRPCIV_TAXES: Record<GhiseulDrpcivTaxType, { label: string; amount: number }> = {
  certificat_inmatriculare: { label: 'Certificat de înmatriculare', amount: 49 },
  permis_conducere: { label: 'Permis de conducere', amount: 89 },
  autorizatie_provizorie: { label: 'Autorizație provizorie', amount: 13 },
}
const MAX_FILE_COUNT = 30
const MAX_TOTAL_BYTES = 30 * 1024 * 1024
const LIBRETRANSLATE_PUBLIC_ENDPOINTS = [
  'https://libretranslate.de',
  'https://translate.argosopentech.com',
]

export const integrationsRoute = new Hono()

function str(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isTranslationPackage(value: string | null): value is TranslationPackage {
  return value === 'Economy' || value === 'Optimal' || value === 'Premium'
}

function isLibreFormat(value: unknown): value is 'text' | 'html' {
  return value === 'text' || value === 'html'
}

function fileSummary(value: FormDataEntryValue): DocumentSummary | null {
  if (typeof value === 'string') return null
  return {
    name: value.name,
    size: value.size,
    type: value.type || 'application/octet-stream',
  }
}

async function getProfile(userId: string): Promise<Partial<Profile> | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('full_name, cnp, address, city, email, phone')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('wetranslate profile fetch error:', error.message)
    return null
  }

  return data as Partial<Profile> | null
}

async function getVehicle(userId: string, vehicleId: string | null): Promise<Partial<Vehicle> | null> {
  if (!isSupabaseConfigured) return null

  let query = supabaseAdmin
    .from('vehicles')
    .select('id, plate_number, make, model, vin')
    .eq('user_id', userId)

  if (vehicleId) {
    query = query.eq('id', vehicleId)
  } else {
    query = query.order('created_at', { ascending: false }).limit(1)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('wetranslate vehicle fetch error:', error.message)
    return null
  }

  return data as Partial<Vehicle> | null
}

function buildFallbackUrl(payload: WeTranslateHandoff['payload_preview']): string {
  const url = new URL(WETRANSLATE_PUBLIC_FORM_URL)
  url.searchParams.set('source', 'ecetatean')
  url.searchParams.set('service', 'traducere_autorizata')
  url.searchParams.set('from', payload.source_language)
  url.searchParams.set('to', payload.target_language)
  url.searchParams.set('package', payload.package)
  if (payload.customer.name) url.searchParams.set('name', payload.customer.name)
  if (payload.customer.email) url.searchParams.set('email', payload.customer.email)
  if (payload.customer.phone) url.searchParams.set('phone', payload.customer.phone)
  return url.toString()
}

function isGhiseulDrpcivTaxType(value: unknown): value is GhiseulDrpcivTaxType {
  return (
    value === 'certificat_inmatriculare' ||
    value === 'permis_conducere' ||
    value === 'autorizatie_provizorie'
  )
}

function buildGhiseulFallbackUrl(payload: GhiseulDrpcivPaymentHandoff['payload_preview']): string {
  const url = new URL(GHISEUL_DRPCIV_TAX_URL)

  // Ghiseul.ro does not publish a stable autofill API. These parameters are a
  // best-effort handoff for partner/extension support and are harmless if ignored.
  url.searchParams.set('source', 'ecetatean')
  url.searchParams.set('institution', payload.institution)
  url.searchParams.set('person_type', payload.person_type)
  url.searchParams.set('tax_type', payload.tax_type)
  url.searchParams.set('amount_ron', String(payload.amount_ron))
  if (payload.payer_cnp) url.searchParams.set('payer_cnp', payload.payer_cnp)
  if (payload.beneficiary_cnp) url.searchParams.set('beneficiary_cnp', payload.beneficiary_cnp)
  if (payload.beneficiary_name) url.searchParams.set('beneficiary_name', payload.beneficiary_name)
  if (payload.email) {
    url.searchParams.set('email', payload.email)
    url.searchParams.set('confirm_email', payload.email)
  }

  return url.toString()
}

async function createPartnerQuote(
  formData: FormData,
  payload: WeTranslateHandoff['payload_preview']
): Promise<string | null> {
  const apiUrl = process.env.WETRANSLATE_API_URL?.trim()
  if (!apiUrl) return null

  const outbound = new FormData()
  outbound.set('payload', JSON.stringify(payload))
  for (const file of formData.getAll('documents')) {
    if (typeof file !== 'string') outbound.append('documents', file, file.name)
  }

  const headers: Record<string, string> = {}
  const apiKey = process.env.WETRANSLATE_API_KEY?.trim()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: outbound,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`WeTranslate API error ${response.status}: ${message}`)
  }

  const body = (await response.json()) as { confirmation_url?: string; redirect_url?: string }
  return body.confirmation_url ?? body.redirect_url ?? null
}

async function createGhiseulPartnerPayment(
  payload: GhiseulDrpcivPaymentHandoff['payload_preview']
): Promise<string | null> {
  const apiUrl = process.env.GHISEUL_PARTNER_API_URL?.trim()
  if (!apiUrl) return null

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = process.env.GHISEUL_PARTNER_API_KEY?.trim()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      service: 'drpciv_tax',
      payload,
      return_url: GHISEUL_DRPCIV_TAX_URL,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`Ghiseul partner API error ${response.status}: ${message}`)
  }

  const body = (await response.json()) as { payment_url?: string; redirect_url?: string }
  return body.payment_url ?? body.redirect_url ?? null
}

function libreTranslateEndpoints(): string[] {
  const configured = process.env.LIBRETRANSLATE_API_URL?.trim()
  const endpoints = configured
    ? [configured, ...LIBRETRANSLATE_PUBLIC_ENDPOINTS]
    : LIBRETRANSLATE_PUBLIC_ENDPOINTS
  return [...new Set(endpoints.map((endpoint) => endpoint.replace(/\/$/, '')))]
}

function offlineDemoTranslation(q: string, target: string): string {
  if (target !== 'ro') {
    return `[Demo fallback] ${q}`
  }

  return q
    .replace(/Fahrzeugbrief/gi, 'cartea de identitate a vehiculului')
    .replace(/Zulassungsbescheinigung Teil II/gi, 'certificat de înmatriculare partea a II-a')
    .replace(/Kaufvertrag/gi, 'contract de vânzare-cumpărare')
    .replace(/Rechnung/gi, 'factură')
    .replace(/Fahrzeug/gi, 'vehicul')
    .replace(/Käufer/gi, 'cumpărător')
    .replace(/Verkäufer/gi, 'vânzător')
    .replace(/Fahrgestellnummer/gi, 'serie șasiu')
}

async function translateWithLibreTranslate({
  q,
  source,
  target,
  format,
  alternatives,
}: {
  q: string
  source: string
  target: string
  format: 'text' | 'html'
  alternatives: number
}): Promise<Omit<LibreTranslateDemoResult, 'provider' | 'mode'> & { mode: LibreTranslateDemoResult['mode'] }> {
  const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim() ?? ''
  let lastError: unknown = null

  for (const endpoint of libreTranslateEndpoints()) {
    try {
      const response = await fetch(`${endpoint}/translate`, {
        method: 'POST',
        body: JSON.stringify({
          q,
          source,
          target,
          format,
          alternatives,
          api_key: apiKey,
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
      })

      if (!response.ok) {
        lastError = new Error(await response.text().catch(() => `HTTP ${response.status}`))
        continue
      }

      const body = (await response.json()) as {
        translatedText?: string | string[]
        detectedLanguage?: { confidence?: number; language?: string }
        alternatives?: string[]
      }
      const translatedText = Array.isArray(body.translatedText)
        ? body.translatedText.join('\n')
        : body.translatedText

      if (!translatedText) {
        lastError = new Error('LibreTranslate response missing translatedText')
        continue
      }

      return {
        mode: 'libretranslate_api',
        source,
        target,
        format,
        alternatives,
        translated_text: translatedText,
        detected_language: body.detectedLanguage,
        alternative_translations: body.alternatives,
        endpoint_used: endpoint,
      }
    } catch (err) {
      lastError = err
    }
  }

  console.error('libretranslate demo fallback used:', lastError)
  return {
    mode: 'offline_demo_fallback',
    source,
    target,
    format,
    alternatives,
    translated_text: offlineDemoTranslation(q, target),
    endpoint_used: null,
  }
}

integrationsRoute.post('/wetranslate/quote', requireAuth, async (c) => {
  const userId = c.get('userId')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  if (str(formData.get('consent')) !== 'true') {
    return c.json({ success: false, error: 'Confirmă partajarea datelor cu WeTranslate' }, 400)
  }

  const sourceLanguage = str(formData.get('source_language')) ?? 'Germană'
  const targetLanguage = str(formData.get('target_language')) ?? 'Română'
  const requestedPackage = str(formData.get('package'))
  const packageName: TranslationPackage = isTranslationPackage(requestedPackage)
    ? requestedPackage
    : 'Optimal'
  const deliveryMethod = str(formData.get('delivery_method')) ?? 'E-mail'
  const vehicleId = str(formData.get('vehicle_id'))

  const [profile, vehicle] = await Promise.all([
    getProfile(userId),
    getVehicle(userId, vehicleId),
  ])

  const documents = formData
    .getAll('documents')
    .map(fileSummary)
    .filter((doc): doc is DocumentSummary => doc !== null)
  const totalDocumentBytes = documents.reduce((sum, doc) => sum + doc.size, 0)

  if (documents.length > MAX_FILE_COUNT || totalDocumentBytes > MAX_TOTAL_BYTES) {
    return c.json(
      { success: false, error: 'WeTranslate acceptă maximum 30 fișiere și 30MB în total' },
      400
    )
  }

  const missingFields = [
    !profile?.full_name ? 'Nume complet' : null,
    !profile?.email ? 'Email' : null,
    !profile?.phone ? 'Telefon' : null,
    documents.length === 0 ? 'Documente de tradus' : null,
  ].filter((field): field is string => field !== null)

  const payload: WeTranslateHandoff['payload_preview'] = {
    service: 'Traducere autorizată',
    source_language: sourceLanguage,
    target_language: targetLanguage,
    package: packageName,
    delivery_method: deliveryMethod,
    customer: {
      name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
    },
    documents,
    vehicle: vehicle
      ? {
          make: vehicle.make ?? null,
          model: vehicle.model ?? null,
          vin: vehicle.vin ?? null,
          plate_number: vehicle.plate_number ?? null,
        }
      : null,
  }

  let mode: WeTranslateHandoff['mode'] = 'public_form_fallback'
  let redirectUrl = buildFallbackUrl(payload)

  try {
    const partnerRedirect = await createPartnerQuote(formData, payload)
    if (partnerRedirect) {
      mode = 'partner_api'
      redirectUrl = partnerRedirect
    }
  } catch (err) {
    console.error('wetranslate partner handoff error:', err)
  }

  const handoffId = `wt-${Date.now()}`

  writeAuditEntry({
    userId,
    action: 'Cerere traducere autorizată pregătită pentru WeTranslate',
    actionType: 'translation_quote_started',
    data: {
      handoff_id: handoffId,
      mode,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      documents: documents.map((doc) => ({ name: doc.name, size: doc.size })),
      missing_fields: missingFields,
    },
  })

  const result: WeTranslateHandoff = {
    provider: 'wetranslate',
    mode,
    redirect_url: redirectUrl,
    handoff_id: handoffId,
    missing_fields: missingFields,
    payload_preview: payload,
  }

  return c.json({ success: true, data: result })
})

integrationsRoute.post('/libretranslate/translate', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: {
    q?: unknown
    source?: unknown
    target?: unknown
    format?: unknown
    alternatives?: unknown
  } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const q = typeof body.q === 'string' ? body.q.trim() : ''
  if (!q) {
    return c.json({ success: false, error: 'Textul de tradus este obligatoriu' }, 400)
  }

  const source = typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'auto'
  const target = typeof body.target === 'string' && body.target.trim() ? body.target.trim() : 'ro'
  const format = isLibreFormat(body.format) ? body.format : 'text'
  const alternatives =
    typeof body.alternatives === 'number' && Number.isFinite(body.alternatives)
      ? Math.max(0, Math.min(5, Math.round(body.alternatives)))
      : 3

  const translated = await translateWithLibreTranslate({
    q,
    source,
    target,
    format,
    alternatives,
  })

  writeAuditEntry({
    userId,
    action:
      translated.mode === 'libretranslate_api'
        ? 'Traducere demo realizată cu LibreTranslate'
        : 'Traducere demo realizată local ca fallback',
    actionType: 'translation_demo_completed',
    data: {
      provider: 'libretranslate_demo',
      mode: translated.mode,
      source,
      target,
      character_count: q.length,
      endpoint_used: translated.endpoint_used,
    },
  })

  const result: LibreTranslateDemoResult = {
    provider: 'libretranslate_demo',
    ...translated,
  }

  return c.json({ success: true, data: result })
})

integrationsRoute.post('/ghiseul/drpciv-tax', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: { tax_type?: unknown } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const taxType: GhiseulDrpcivTaxType = isGhiseulDrpcivTaxType(body.tax_type)
    ? body.tax_type
    : 'certificat_inmatriculare'
  const tax = GHISEUL_DRPCIV_TAXES[taxType]
  const profile = await getProfile(userId)

  const missingFields = [
    !profile?.cnp ? 'CNP' : null,
    !profile?.full_name ? 'Nume și prenume' : null,
    !profile?.email ? 'Email' : null,
  ].filter((field): field is string => field !== null)

  const payload: GhiseulDrpcivPaymentHandoff['payload_preview'] = {
    institution: 'RAAPPS',
    person_type: 'Persoană fizică',
    tax_type: tax.label,
    amount_ron: tax.amount,
    payer_cnp: profile?.cnp ?? null,
    beneficiary_cnp: profile?.cnp ?? null,
    beneficiary_name: profile?.full_name ?? null,
    email: profile?.email ?? null,
    confirm_email: profile?.email ?? null,
    captcha_required: true,
  }

  let mode: GhiseulDrpcivPaymentHandoff['mode'] = 'public_form_fallback'
  let redirectUrl = buildGhiseulFallbackUrl(payload)

  try {
    const partnerRedirect = await createGhiseulPartnerPayment(payload)
    if (partnerRedirect) {
      mode = 'partner_api'
      redirectUrl = partnerRedirect
    }
  } catch (err) {
    console.error('ghiseul partner handoff error:', err)
  }

  const handoffId = `ghiseul-drpciv-${Date.now()}`

  writeAuditEntry({
    userId,
    action: 'Plată DRPCIV pregătită pentru Ghișeul.ro',
    actionType: 'payment_handoff_started',
    data: {
      handoff_id: handoffId,
      mode,
      tax_type: taxType,
      amount_ron: tax.amount,
      missing_fields: missingFields,
    },
  })

  const result: GhiseulDrpcivPaymentHandoff = {
    provider: 'ghiseul_drpciv',
    mode,
    redirect_url: redirectUrl,
    handoff_id: handoffId,
    missing_fields: missingFields,
    payload_preview: payload,
  }

  return c.json({ success: true, data: result })
})
