import { Hono, type Context } from 'hono'
import { requireAuth } from '../middleware/auth'
import { writeAuditEntry } from '../lib/hash-chain'
import { supabaseAdmin } from '../lib/supabase'
import {
  analyzePdf,
  demoForms,
  fillPdf,
  getPdfBytes,
  hydrateFieldValues,
  missingInputsForFields,
  normalizeFields,
  normalizeForm,
} from '../lib/pdf-autofill'
import type { PdfAutofillField, PdfForm, Profile } from '../types'

type AnalyzeRequest = {
  additional_data?: Record<string, string>
}

type FillRequest = {
  additional_data?: Record<string, string>
  fields?: PdfAutofillField[]
}

export const formsRoute = new Hono()

formsRoute.get('/search', requireAuth, async (c) => {
  const query = (c.req.query('q') ?? '').trim()

  try {
    const { data, error } = await supabaseAdmin
      .from('pdf_forms')
      .select('*')
      .eq('is_active', true)
      .order('title', { ascending: true })

    if (error) throw error

    const forms = ((data ?? []) as unknown[]).map((row) => normalizeForm(row as never))
    return c.json({ success: true, data: filterForms(forms.length ? forms : demoForms(), query) })
  } catch (err) {
    console.error('PDF form search failed, using demo catalog:', err)
    return c.json({ success: true, data: filterForms(demoForms(), query) })
  }
})

formsRoute.get('/:id', requireAuth, async (c) => {
  const form = await findForm(c.req.param('id'))
  if (!form) {
    return c.json({ success: false, error: 'Formularul nu a fost gasit' }, 404)
  }

  return c.json({ success: true, data: form })
})

formsRoute.post('/:id/analyze', requireAuth, async (c) => {
  const form = await findForm(c.req.param('id'))
  if (!form) {
    return c.json({ success: false, error: 'Formularul nu a fost gasit' }, 404)
  }

  const userId = c.get('userId')
  const body = await readJson<AnalyzeRequest>(c)
  const profile = await loadProfile(userId)
  const inputValues = body.additional_data ?? {}
  const sourcePdf = await getPdfBytes(form)
  const fields = await analyzePdf(form, sourcePdf, profile, inputValues)
  const missingInputs = missingInputsForFields(fields, form.required_inputs)

  return c.json({
    success: true,
    data: {
      form,
      fields,
      missing_inputs: missingInputs,
      can_autofill_count: fields.filter((field) => field.value?.trim()).length,
      total_required_count: fields.filter((field) => field.required).length,
    },
  })
})

formsRoute.post('/:id/fill', requireAuth, async (c) => {
  const form = await findForm(c.req.param('id'))
  if (!form) {
    return c.json({ success: false, error: 'Formularul nu a fost gasit' }, 404)
  }

  const userId = c.get('userId')
  const body = await readJson<FillRequest>(c)
  const profile = await loadProfile(userId)
  const inputValues = body.additional_data ?? {}

  let sourcePdf: Uint8Array
  try {
    sourcePdf = await getPdfBytes(form)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF template unavailable'
    console.error('getPdfBytes failed:', message)
    return c.json({ success: false, error: message }, 503)
  }

  let pdfBuffer: Buffer
  try {
    const fields = body.fields?.length
      ? normalizeFields(body.fields)
      : await analyzePdf(form, sourcePdf, profile, inputValues)
    pdfBuffer = await fillPdf(sourcePdf, fields, profile, inputValues)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF fill failed'
    console.error('fillPdf failed:', message)
    return c.json({ success: false, error: `Eroare la completarea PDF-ului: ${message}` }, 500)
  }

  writeAuditEntry({
    userId,
    action: `Formular autocompletat: ${form.title}`,
    actionType: 'pdf_generated',
    data: { form_id: form.id, slug: form.slug },
  })

  const fileName = `${form.slug}_${Date.now()}.pdf`
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length.toString(),
    },
  })
})

formsRoute.post('/:id/mapping', requireAuth, async (c) => {
  const form = await findForm(c.req.param('id'))
  if (!form) {
    return c.json({ success: false, error: 'Formularul nu a fost gasit' }, 404)
  }

  const body = await readJson<{ fields?: PdfAutofillField[] }>(c)
  const fields = normalizeFields(body.fields ?? []).map(({ value: _value, ...field }) => field)
  if (!fields.length) {
    return c.json({ success: false, error: 'Nu exista campuri de salvat' }, 400)
  }

  const { data, error } = await supabaseAdmin
    .from('pdf_forms')
    .update({ mapping: fields, updated_at: new Date().toISOString() })
    .eq('id', form.id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return c.json({ success: false, error: 'Maparea nu a putut fi salvata' }, 500)
  }

  return c.json({ success: true, data: normalizeForm(data as never) })
})

async function findForm(idOrSlug: string): Promise<PdfForm | null> {
  try {
    const query = supabaseAdmin
      .from('pdf_forms')
      .select('*')

    const { data, error } = await (isUuid(idOrSlug)
      ? query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      : query.eq('slug', idOrSlug)
    ).maybeSingle()

    if (!error && data) return normalizeForm(data as never)
  } catch (err) {
    console.error('PDF form lookup failed, checking demo catalog:', err)
  }

  return demoForms().find((form) => form.id === idOrSlug || form.slug === idOrSlug) ?? null
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function loadProfile(userId: string): Promise<Partial<Profile>> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return (data as Partial<Profile> | null) ?? {}
}

async function readJson<T>(c: Context): Promise<T> {
  try {
    return await c.req.json<T>()
  } catch {
    return {} as T
  }
}

function filterForms(forms: PdfForm[], query: string): PdfForm[] {
  if (!query) return forms
  const normalizedQuery = normalize(query)
  return forms.filter((form) => {
    const haystack = [
      form.title,
      form.institution,
      form.description ?? '',
      form.category,
      ...form.tags,
    ]
      .join(' ')
      .toLowerCase()
    return normalize(haystack).includes(normalizedQuery)
  })
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
