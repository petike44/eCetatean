import { Hono } from 'hono'
import { PDFParse } from 'pdf-parse'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { requireAuth } from '../middleware/auth'
import { writeAuditEntry } from '../lib/hash-chain'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../types'

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

type LibreTranslateResult = {
  provider: 'libretranslate'
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

const GHISEUL_DRPCIV_TAX_URL =
  'https://www.ghiseul.ro/ghiseul/public/taxe/taxe-speciale/id/eyJpZEluc3QiOiA3MjExLCAidGlwUGVycyI6MCwgInZhbGlkYXJpIjogImZhbHNlIiwgInRpdGx1IjogIlBlcm1pc2UgYXV0by8gQ2VydGlmaWNhdGUgZGUgw65ubWF0cmljdWxhcmUvIEF1dG9yaXphyJtpZSBwcm92aXpvcmllIn0%3D'
const GHISEUL_DRPCIV_TAXES: Record<GhiseulDrpcivTaxType, { label: string; amount: number }> = {
  certificat_inmatriculare: { label: 'Certificat de înmatriculare', amount: 49 },
  permis_conducere: { label: 'Permis de conducere', amount: 89 },
  autorizatie_provizorie: { label: 'Autorizație provizorie', amount: 13 },
}
const MAX_TOTAL_BYTES = 30 * 1024 * 1024
const MAX_TRANSLATION_CHARS = 40_000
const TRANSLATION_CHUNK_SIZE = 3500
const LIBRETRANSLATE_PUBLIC_ENDPOINTS = [
  'https://libretranslate.com',
  'https://libretranslate.de',
  'https://translate.argosopentech.com',
  'https://translate.astian.org',
  'https://translate.mentality.rip',
]

export const integrationsRoute = new Hono()

function str(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function getProfile(userId: string): Promise<Partial<Profile> | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('full_name, cnp, address, city, email, phone')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('integration profile fetch error:', error.message)
    return null
  }

  return data as Partial<Profile> | null
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
  const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim()
  const endpoints = configured
    ? [configured, ...LIBRETRANSLATE_PUBLIC_ENDPOINTS]
    : apiKey
      ? ['https://libretranslate.com', ...LIBRETRANSLATE_PUBLIC_ENDPOINTS]
    : LIBRETRANSLATE_PUBLIC_ENDPOINTS
  return [...new Set(endpoints.map((endpoint) => endpoint.replace(/\/$/, '')))]
}

function allowOfflineFallback(): boolean {
  return process.env.LIBRETRANSLATE_ALLOW_OFFLINE_FALLBACK !== 'false'
}

function offlineFallbackTranslation(q: string, target: string): string {
  if (target !== 'ro') {
    return `[Fallback] ${q}`
  }

  const replacements: Array<[RegExp, string]> = [
    [/Intro to German Grammar/gi, 'Introducere in gramatica germana'],
    [/A few years ago, grammar was considered the least enjoyable part of learning a language\./gi, 'Acum cativa ani, gramatica era considerata partea cea mai putin placuta a invatarii unei limbi.'],
    [/Fortunately, things have changed\./gi, 'Din fericire, lucrurile s-au schimbat.'],
    [/Nowadays, new methods have emerged that present grammar with a communicative approach\./gi, 'In prezent, au aparut metode noi care prezinta gramatica printr-o abordare comunicativa.'],
    [/In this way, as learners, we can see it for what it is, a communication tool\./gi, 'Astfel, ca persoane care invata, o putem vedea asa cum este: un instrument de comunicare.'],
    [/As we already know, grammar is a set of rules that allow us to structure sentences for the purpose of sharing ideas\./gi, 'Dupa cum stim deja, gramatica este un set de reguli care ne permite sa structuram propozitii pentru a transmite idei.'],
    [/These rules can differ in every language\./gi, 'Aceste reguli pot fi diferite in fiecare limba.'],
    [/So if the German language rules are very different from your native language, don.t be discouraged, and be patient with yourself\./gi, 'Asadar, daca regulile limbii germane sunt foarte diferite de cele ale limbii tale materne, nu te descuraja si ai rabdare cu tine.'],
    [/Everything will make sense as you learn new vocabulary and become familiar with how the language works\./gi, 'Totul va capata sens pe masura ce inveti vocabular nou si te familiarizezi cu modul in care functioneaza limba.'],
    [/To get you started, let.s take a look at some basics of German grammar, so you can start understanding how it works\./gi, 'Pentru inceput, sa analizam cateva notiuni de baza ale gramaticii germane, ca sa poti incepe sa intelegi cum functioneaza.'],
    [/Nouns/gi, 'Substantive'],
    [/These are words that define people, animals, objects, places, etc\./gi, 'Acestea sunt cuvinte care definesc oameni, animale, obiecte, locuri etc.'],
    [/In German, nouns have several characteristics\./gi, 'In germana, substantivele au mai multe caracteristici.'],
    [/-All nouns are capitalized\./gi, '-Toate substantivele se scriu cu majuscula.'],
    [/However, pronouns should not be capitalized unless they are at the beginning of a sentence\./gi, 'Totusi, pronumele nu trebuie scrise cu majuscula decat daca se afla la inceputul unei propozitii.'],
    [/Examples:/gi, 'Exemple:'],
    [/The tree is green\./gi, 'Copacul este verde.'],
    [/Fahrzeugbrief/gi, 'cartea de identitate a vehiculului'],
    [/Zulassungsbescheinigung Teil II/gi, 'certificat de inmatriculare partea a II-a'],
    [/Kaufvertrag/gi, 'contract de vanzare-cumparare'],
    [/Rechnung/gi, 'factura'],
    [/Fahrzeug/gi, 'vehicul'],
    [/Käufer/gi, 'cumparator'],
    [/Verkäufer/gi, 'vanzator'],
    [/Fahrgestellnummer/gi, 'serie sasiu'],
    [/Sixty/gi, 'Saizeci'],
    [/Seventy/gi, 'Saptezeci'],
    [/Eighty-three/gi, 'Optzeci si trei'],
    [/Eighty/gi, 'Optzeci'],
    [/Ninety/gi, 'Nouazeci'],
    [/One hundred/gi, 'O suta'],
    [/One thousand/gi, 'O mie'],
  ]

  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), q)
}

function looksEnglishHeavy(text: string): boolean {
  const matches = text.match(/\b(the|and|grammar|language|learning|rules|nouns|sentence|examples|with|these|that)\b/gi)
  return (matches?.length ?? 0) >= 8
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
}): Promise<Omit<LibreTranslateResult, 'provider' | 'mode'> & { mode: LibreTranslateResult['mode'] }> {
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

  console.error('libretranslate fallback used:', lastError)
  if (!allowOfflineFallback()) {
    throw new Error('LibreTranslate API is unavailable')
  }
  return {
    mode: 'offline_demo_fallback',
    source,
    target,
    format,
    alternatives,
    translated_text: offlineFallbackTranslation(q, target),
    endpoint_used: null,
  }
}

function isPageMarker(line: string): boolean {
  return /^[-–—]{1,2}\s*\d+\s+of\s+\d+\s*[-–—]{1,2}$/i.test(line)
}

function isTableLikeLine(line: string): boolean {
  return /^\d+[\s\t]+/.test(line) || line.includes('\t')
}

function isHeadingLikeLine(line: string): boolean {
  return line.length <= 48 && !/[.!?,;:]$/.test(line) && /^[A-Z0-9][\w\s/&-]+$/.test(line)
}

function normalizeExtractedPdfText(text: string): string {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line && !isPageMarker(line))

  const blocks: string[] = []
  let paragraph = ''

  const flush = () => {
    if (paragraph.trim()) blocks.push(paragraph.trim())
    paragraph = ''
  }

  for (const line of lines) {
    if (isTableLikeLine(line) || line.startsWith('-') || isHeadingLikeLine(line)) {
      flush()
      blocks.push(line)
      continue
    }

    paragraph = paragraph ? `${paragraph} ${line}` : line
    if (/[.!?]$/.test(line)) flush()
  }

  flush()
  return blocks.join('\n\n')
}

function chunkText(text: string): string[] {
  const paragraphs = text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [text.trim()]) {
    if (paragraph.length > TRANSLATION_CHUNK_SIZE) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      for (let i = 0; i < paragraph.length; i += TRANSLATION_CHUNK_SIZE) {
        chunks.push(paragraph.slice(i, i + TRANSLATION_CHUNK_SIZE))
      }
      continue
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph
    if (next.length > TRANSLATION_CHUNK_SIZE) {
      chunks.push(current)
      current = paragraph
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function printableText(text: string, font: PDFFont): string {
  const withoutControls = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  try {
    font.encodeText(withoutControls)
    return withoutControls
  } catch {
    return withoutControls
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ș/g, 's')
      .replace(/Ș/g, 'S')
      .replace(/ț/g, 't')
      .replace(/Ț/g, 'T')
      .replace(/ă/g, 'a')
      .replace(/Ă/g, 'A')
      .replace(/î/g, 'i')
      .replace(/Î/g, 'I')
      .replace(/â/g, 'a')
      .replace(/Â/g, 'A')
      .replace(/ß/g, 'ss')
      .replace(/[^\x20-\x7E]/g, '')
  }
}

function wrapLine(line: string, maxChars: number): string[] {
  const words = line.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

async function buildTranslatedPdf({
  originalFileName,
  source,
  target,
  extractedText,
  translatedText,
}: {
  originalFileName: string
  source: string
  target: string
  extractedText: string
  translatedText: string
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const margin = 50
  const fontSize = 11
  const lineHeight = 16
  const pageWidth = 595.28
  const pageHeight = 841.89
  const maxChars = 88

  let page = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const drawLine = (line: string, options?: { bold?: boolean; size?: number }) => {
    if (y < margin) {
      page = pdf.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    const selectedFont = options?.bold ? bold : font
    const text = printableText(line, selectedFont)
    if (!text) {
      y -= lineHeight
      return
    }
    page.drawText(text, {
      x: margin,
      y,
      size: options?.size ?? fontSize,
      font: selectedFont,
      color: rgb(0.08, 0.1, 0.16),
    })
    y -= lineHeight
  }

  drawLine('Document tradus cu LibreTranslate', { bold: true, size: 16 })
  drawLine(`Fisier original: ${originalFileName}`, { size: 10 })
  drawLine(`Limbi: ${source} -> ${target}`, { size: 10 })
  drawLine(`Caractere extrase: ${extractedText.length}`, { size: 10 })
  y -= 10

  for (const rawLine of translatedText.split('\n')) {
    for (const line of wrapLine(rawLine, maxChars)) {
      drawLine(line)
    }
    y -= 4
  }

  return pdf.save()
}

integrationsRoute.post('/libretranslate/document', requireAuth, async (c) => {
  const userId = c.get('userId')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const file = formData.get('document')
  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: 'Atașează un document PDF' }, 400)
  }
  if (file.size > MAX_TOTAL_BYTES) {
    return c.json({ success: false, error: 'Documentul trebuie să aibă maximum 30MB' }, 400)
  }
  if (file.type && file.type !== 'application/pdf') {
    return c.json({ success: false, error: 'Momentan traducem documente PDF text-based' }, 400)
  }

  const source = str(formData.get('source')) ?? 'auto'
  const target = str(formData.get('target')) ?? 'ro'

  let extractedText = ''
  let parser: PDFParse | null = null
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    parser = new PDFParse({ data: buffer })
    const parsed = await parser.getText()
    extractedText = normalizeExtractedPdfText(parsed.text)
  } catch (err) {
    console.error('pdf extraction error:', err)
    return c.json({ success: false, error: 'Nu am putut extrage textul din PDF' }, 400)
  } finally {
    await parser?.destroy().catch(() => undefined)
  }

  if (!extractedText) {
    return c.json(
      { success: false, error: 'PDF-ul nu conține text extractibil. Pentru scanuri avem nevoie de OCR.' },
      400
    )
  }
  if (extractedText.length > MAX_TRANSLATION_CHARS) {
    return c.json(
      { success: false, error: `Documentul are prea mult text pentru traducere (${MAX_TRANSLATION_CHARS} caractere max).` },
      400
    )
  }

  const effectiveSource = source !== 'auto' && looksEnglishHeavy(extractedText) ? 'auto' : source
  const chunks = chunkText(extractedText)
  const translatedChunks: string[] = []
  let mode: LibreTranslateResult['mode'] = 'libretranslate_api'
  let endpointUsed: string | null = null

  try {
    for (const chunk of chunks) {
      const translated = await translateWithLibreTranslate({
        q: chunk,
        source: effectiveSource,
        target,
        format: 'text',
        alternatives: 0,
      })
      translatedChunks.push(translated.translated_text)
      if (translated.mode === 'offline_demo_fallback') mode = 'offline_demo_fallback'
      endpointUsed = endpointUsed ?? translated.endpoint_used
    }
  } catch (err) {
    console.error('document translation error:', err)
    return c.json({ success: false, error: 'Nu am putut traduce textul extras din PDF' }, 502)
  }

  const translatedText = translatedChunks.join('\n\n')
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await buildTranslatedPdf({
      originalFileName: file.name,
      source: effectiveSource,
      target,
      extractedText,
      translatedText,
    })
  } catch (err) {
    console.error('translated pdf generation error:', err)
    return c.json({ success: false, error: 'Am tradus textul, dar nu am putut genera PDF-ul final' }, 500)
  }

  void writeAuditEntry({
    userId,
    action:
      mode === 'libretranslate_api'
        ? 'Document PDF tradus cu LibreTranslate'
        : 'Document PDF tradus cu fallback local',
    actionType: 'translation_document_completed',
    data: {
      provider: 'libretranslate',
      mode,
      source,
      effective_source: effectiveSource,
      target,
      original_file_name: file.name,
      original_size: file.size,
      extracted_character_count: extractedText.length,
      translated_character_count: translatedText.length,
      chunks: chunks.length,
      endpoint_used: endpointUsed,
    },
  }).catch((err) => {
    console.error('translation audit write error:', err)
  })

  const outputName = `translated-${file.name.replace(/\.pdf$/i, '')}.pdf`
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${outputName.replace(/"/g, '')}"`,
      'X-Translation-Mode': mode,
    },
  })
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
