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

const WETRANSLATE_PUBLIC_FORM_URL = 'https://www.wetranslate.ro/oferta/?page=49_1'
const MAX_FILE_COUNT = 30
const MAX_TOTAL_BYTES = 30 * 1024 * 1024

export const integrationsRoute = new Hono()

function str(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isTranslationPackage(value: string | null): value is TranslationPackage {
  return value === 'Economy' || value === 'Optimal' || value === 'Premium'
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
    .select('full_name, address, city, email, phone')
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
