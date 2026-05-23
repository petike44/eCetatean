import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFTextField,
} from '@pdfme/pdf-lib'
import { supabaseAdmin } from './supabase'
import type {
  PdfAutofillField,
  PdfForm,
  PdfFormInputDefinition,
  Profile,
} from '../types'

type FormRow = Omit<PdfForm, 'mapping' | 'required_inputs'> & {
  mapping: unknown
  required_inputs: unknown
}

const A4_WIDTH = 595
const A4_HEIGHT = 842

const DEMO_FORMS: PdfForm[] = [
  {
    id: 'demo-viza-flotant',
    slug: 'cerere-viza-flotant',
    title: 'Cerere pentru stabilirea resedintei',
    institution: 'Directia pentru Evidenta Persoanelor',
    description: 'Formular pentru solicitarea vizei de flotant / stabilirea resedintei.',
    category: 'evidenta-persoanelor',
    tags: ['viza flotant', 'resedinta', 'domiciliu', 'buletin'],
    storage_bucket: 'pdf-forms',
    storage_path: 'cerere-viza-flotant.pdf',
    source_url: null,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    mapping: [
      field('full_name', 'Nume si prenume', 'profile.full_name', 145, 156, 260, true, 0.92),
      field('cnp', 'CNP', 'profile.cnp', 145, 184, 210, true, 0.92),
      field('identity_card', 'CI seria si numarul', 'profile.identity_card', 145, 212, 210, true, 0.86),
      field('current_address', 'Domiciliu actual', 'profile.full_address', 145, 240, 320, true, 0.88),
      field('new_address', 'Adresa resedintei solicitate', 'input.new_address', 145, 302, 330, true, 0.9),
      field('period', 'Perioada solicitata', 'input.period', 145, 330, 210, false, 0.78),
      field('date', 'Data', 'system.today', 145, 680, 120, true, 0.95),
    ],
    required_inputs: [
      { key: 'new_address', label: 'Adresa resedintei solicitate', placeholder: 'Strada, numar, bloc, apartament' },
      { key: 'period', label: 'Perioada solicitata', placeholder: '12 luni' },
    ],
  },
  {
    id: 'demo-drpciv',
    slug: 'demo-drpciv',
    title: 'Cerere inmatriculare vehicul',
    institution: 'DRPCIV',
    description: 'Cerere pentru inmatricularea sau transcrierea unui vehicul.',
    category: 'auto',
    tags: ['drpciv', 'inmatriculare', 'vehicul', 'auto'],
    storage_bucket: 'pdf-forms',
    storage_path: 'cerere-inmatriculare-drpciv.pdf.pdf',
    source_url: null,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    mapping: [
      field('full_name', 'Subsemnatul(a)', 'profile.full_name', 145, 150, 260, true, 0.9),
      field('cnp', 'CNP / CUI', 'profile.cnp', 145, 178, 210, true, 0.9),
      field('address', 'Domiciliu', 'profile.full_address', 145, 206, 320, true, 0.88),
      field('email', 'E-mail', 'profile.email', 145, 234, 210, false, 0.88),
      field('phone', 'Telefon', 'profile.phone', 145, 262, 160, false, 0.88),
      field('vehicle_make', 'Marca vehicul', 'input.make', 145, 340, 160, true, 0.9),
      field('vehicle_model', 'Model / tip', 'input.model', 330, 340, 150, true, 0.84),
      field('vin', 'Numar identificare VIN', 'input.vin', 145, 368, 260, true, 0.9),
      field('current_plate', 'Numar inmatriculare actual', 'input.current_plate', 145, 396, 160, false, 0.8),
      field('date', 'Data', 'system.today', 145, 680, 120, true, 0.95),
    ],
    required_inputs: [
      { key: 'make', label: 'Marca vehiculului', placeholder: 'Dacia' },
      { key: 'model', label: 'Model / tip', placeholder: 'Logan' },
      { key: 'vin', label: 'Numar identificare VIN', placeholder: 'VF1...' },
      { key: 'current_plate', label: 'Numar inmatriculare actual', placeholder: 'CJ 01 ABC' },
    ],
  },
  {
    id: 'demo-certificat-fiscal',
    slug: 'cerere-certificat-fiscal',
    title: 'Cerere certificat fiscal',
    institution: 'Directia Taxe si Impozite Locale',
    description: 'Cerere pentru eliberarea certificatului fiscal local.',
    category: 'taxe',
    tags: ['certificat fiscal', 'taxe', 'impozite', 'primarie'],
    storage_bucket: 'pdf-forms',
    storage_path: 'cerere-certificat-fiscal.pdf',
    source_url: null,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    mapping: [
      field('full_name', 'Nume si prenume contribuabil', 'profile.full_name', 150, 160, 260, true, 0.92),
      field('cnp', 'CNP', 'profile.cnp', 150, 188, 210, true, 0.92),
      field('address', 'Domiciliu fiscal', 'profile.full_address', 150, 216, 320, true, 0.88),
      field('email', 'E-mail', 'profile.email', 150, 244, 210, false, 0.86),
      field('purpose', 'Scopul solicitarii', 'input.purpose', 150, 314, 320, true, 0.84),
      field('date', 'Data', 'system.today', 150, 680, 120, true, 0.95),
    ],
    required_inputs: [
      { key: 'purpose', label: 'Scopul solicitarii', placeholder: 'Dosar vanzare-cumparare' },
    ],
  },
]

function field(
  id: string,
  label: string,
  dataKey: string,
  x: number,
  y: number,
  width: number,
  required: boolean,
  confidence: number
): PdfAutofillField {
  return {
    id,
    label,
    dataKey,
    page: 0,
    x,
    y,
    width,
    height: 18,
    required,
    confidence,
    source: 'saved',
  }
}

export function demoForms(): PdfForm[] {
  return DEMO_FORMS
}

export function normalizeForm(row: FormRow): PdfForm {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    mapping: normalizeFields(row.mapping),
    required_inputs: normalizeInputDefinitions(row.required_inputs),
  }
}

export function normalizeFields(raw: unknown): PdfAutofillField[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const value = item as Partial<PdfAutofillField>
      return {
        id: String(value.id || value.acroFieldName || `field_${index + 1}`),
        label: String(value.label || value.acroFieldName || `Camp ${index + 1}`),
        dataKey: String(value.dataKey || guessDataKey(String(value.label || value.acroFieldName || ''))),
        page: Number(value.page ?? 0),
        x: Number(value.x ?? 80),
        y: Number(value.y ?? 140 + index * 28),
        width: Number(value.width ?? 220),
        height: Number(value.height ?? 18),
        value: typeof value.value === 'string' ? value.value : undefined,
        required: Boolean(value.required ?? true),
        confidence: Number(value.confidence ?? 0.55),
        source: value.source || 'heuristic',
        acroFieldName: value.acroFieldName,
      } satisfies PdfAutofillField
    })
    .filter((item): item is PdfAutofillField => Boolean(item))
}

function normalizeInputDefinitions(raw: unknown): PdfFormInputDefinition[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const value = item as Partial<PdfFormInputDefinition>
      if (!value.key || !value.label) return null
      return {
        key: String(value.key),
        label: String(value.label),
        placeholder: value.placeholder ? String(value.placeholder) : undefined,
        required: Boolean(value.required ?? true),
      }
    })
    .filter((item): item is PdfFormInputDefinition => Boolean(item))
}

export async function getPdfBytes(form: PdfForm): Promise<Uint8Array> {
  // Attempt 1 — authenticated SDK download (requires real service_role key)
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(form.storage_bucket)
      .download(form.storage_path)

    if (data && !error) {
      console.log(`PDF loaded via SDK: ${form.storage_bucket}/${form.storage_path}`)
      return new Uint8Array(await data.arrayBuffer())
    }
    if (error) console.warn(`SDK download rejected (${error.message}) — trying public URL`)
  } catch (err) {
    console.warn('SDK download threw:', err)
  }

  // Attempt 2 — public URL (works when bucket is set to public in Supabase dashboard)
  try {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(form.storage_bucket)
      .getPublicUrl(form.storage_path)

    console.log(`Trying public URL: ${publicUrl}`)
    const res = await fetch(publicUrl)
    if (res.ok) {
      console.log(`PDF loaded via public URL: ${publicUrl}`)
      return new Uint8Array(await res.arrayBuffer())
    }
    console.warn(`Public URL returned ${res.status} — bucket may not be public`)
  } catch (err) {
    console.warn('Public URL fetch failed:', err)
  }

  // Both attempts failed — throw so the route returns a proper error instead of a fake PDF
  throw new Error(
    `Cannot download ${form.storage_path} from bucket "${form.storage_bucket}". ` +
    `Either make the bucket public in Supabase Dashboard → Storage → ${form.storage_bucket} → Policies, ` +
    `or set SUPABASE_SERVICE_ROLE_KEY to the service_role key (not the publishable key).`
  )
}

export async function analyzePdf(
  form: PdfForm,
  sourcePdf: Uint8Array,
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {}
): Promise<PdfAutofillField[]> {
  const savedFields = normalizeFields(form.mapping)
  const nativeFields = await extractAcroFields(sourcePdf)
  const baseFields = nativeFields.length > 0 ? nativeFields : savedFields
  const fallbackFields = baseFields.length > 0 ? baseFields : heuristicFields(form)
  return hydrateFieldValues(fallbackFields, profile, inputValues)
}

export async function fillPdf(
  sourcePdf: Uint8Array,
  fields: PdfAutofillField[],
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {}
): Promise<Buffer> {
  const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const hydratedFields = hydrateFieldValues(fields, profile, inputValues)
  const pdfForm = pdf.getForm()

  for (const field of hydratedFields) {
    const value = (field.value ?? '').trim()
    if (!value) continue

    if (field.acroFieldName) {
      try {
        const textField = pdfForm.getTextField(field.acroFieldName) as PDFTextField
        textField.setText(value)
        continue
      } catch {
        // If the native field cannot be filled, draw an overlay below.
      }
    }

    const page = pdf.getPage(Math.max(0, Math.min(field.page, pdf.getPageCount() - 1)))
    const { height } = page.getSize()
    page.drawText(value, {
      x: field.x,
      y: height - field.y - field.height + 4,
      size: 10,
      font,
      color: rgb(0.05, 0.05, 0.05),
      maxWidth: field.width,
      lineHeight: 12,
    })
  }

  try {
    pdfForm.flatten()
  } catch {
    // Some arbitrary PDFs do not have a valid AcroForm tree.
  }

  return Buffer.from(await pdf.save())
}

export function hydrateFieldValues(
  fields: PdfAutofillField[],
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {}
): PdfAutofillField[] {
  return fields.map((field) => ({
    ...field,
    value: inputValues[field.id] || resolveDataKey(field.dataKey, profile, inputValues) || field.value || '',
  }))
}

export function missingInputsForFields(
  fields: PdfAutofillField[],
  requiredInputs: PdfFormInputDefinition[]
): PdfFormInputDefinition[] {
  const known = new Map(requiredInputs.map((input) => [input.key, input]))
  const missing = new Map<string, PdfFormInputDefinition>()

  for (const field of fields) {
    if (!field.required || field.value?.trim()) continue
    if (!field.dataKey.startsWith('input.')) continue
    const key = field.dataKey.replace(/^input\./, '')
    missing.set(
      key,
      known.get(key) ?? {
        key,
        label: field.label,
        required: true,
      }
    )
  }

  return [...missing.values()]
}

async function extractAcroFields(sourcePdf: Uint8Array): Promise<PdfAutofillField[]> {
  try {
    const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true })
    const fields = pdf.getForm().getFields()
    return fields.map((fieldItem, index) => {
      const name = fieldItem.getName()
      const rect = getFieldRectangle(fieldItem)
      const pageIndex = rect?.page ?? 0
      return {
        id: safeId(name) || `acro_${index + 1}`,
        label: name,
        dataKey: guessDataKey(name),
        page: pageIndex,
        x: rect?.x ?? 80,
        y: rect?.y ?? 140 + index * 28,
        width: rect?.width ?? 220,
        height: rect?.height ?? 18,
        required: true,
        confidence: 0.72,
        source: 'acroform',
        acroFieldName: name,
      }
    })
  } catch {
    return []
  }
}

function getFieldRectangle(fieldItem: unknown):
  | { page: number; x: number; y: number; width: number; height: number }
  | null {
  try {
    const acroField = (fieldItem as { acroField?: { getWidgets?: () => unknown[] } }).acroField
    const widget = acroField?.getWidgets?.()[0] as
      | {
          getRectangle?: () => { x: number; y: number; width: number; height: number }
          P?: () => unknown
        }
      | undefined
    const rect = widget?.getRectangle?.()
    if (!rect) return null

    return {
      page: 0,
      x: rect.x,
      y: Math.max(0, A4_HEIGHT - rect.y - rect.height),
      width: rect.width,
      height: rect.height,
    }
  } catch {
    return null
  }
}

function heuristicFields(form: PdfForm): PdfAutofillField[] {
  const labels = [
    ['full_name', 'Nume si prenume', 'profile.full_name'],
    ['cnp', 'CNP', 'profile.cnp'],
    ['address', 'Adresa', 'profile.full_address'],
    ['email', 'E-mail', 'profile.email'],
    ['phone', 'Telefon', 'profile.phone'],
    ['date', 'Data', 'system.today'],
  ] as const

  return labels.map(([id, label, dataKey], index) => ({
    id,
    label,
    dataKey,
    page: 0,
    x: 145,
    y: 150 + index * 28,
    width: 260,
    height: 18,
    required: index < 3,
    confidence: 0.45,
    source: 'heuristic',
  }))
}

function guessDataKey(label: string): string {
  const value = normalize(label)
  if (value.includes('cnp') || value.includes('numeric personal')) return 'profile.cnp'
  if (value.includes('email') || value.includes('mail')) return 'profile.email'
  if (value.includes('telefon') || value.includes('phone')) return 'profile.phone'
  if (value.includes('adresa') || value.includes('domicili') || value.includes('resedint')) {
    return value.includes('solicitat') || value.includes('nou') ? 'input.new_address' : 'profile.full_address'
  }
  if (value.includes('serie') || value.includes('numar') && value.includes('ci')) return 'profile.identity_card'
  if (value.includes('data')) return 'system.today'
  if (value.includes('marca')) return 'input.make'
  if (value.includes('model') || value.includes('tip')) return 'input.model'
  if (value.includes('vin') || value.includes('sasiu') || value.includes('identificare')) return 'input.vin'
  if (value.includes('scop')) return 'input.purpose'
  if (value.includes('nume') || value.includes('prenume') || value.includes('subsemnat')) return 'profile.full_name'
  return `input.${safeId(label) || 'value'}`
}

function resolveDataKey(
  dataKey: string,
  profile: Partial<Profile>,
  inputValues: Record<string, string>
): string {
  if (dataKey === 'system.today') return new Date().toLocaleDateString('ro-RO')
  if (dataKey === 'profile.full_address') {
    return [profile.address, profile.city].filter(Boolean).join(', ')
  }
  if (dataKey === 'profile.identity_card') {
    return [profile.buletin_series, profile.buletin_number].filter(Boolean).join(' ')
  }
  if (dataKey.startsWith('profile.')) {
    const key = dataKey.replace(/^profile\./, '') as keyof Profile
    const value = profile[key]
    return typeof value === 'string' ? value : ''
  }
  if (dataKey.startsWith('input.')) {
    const key = dataKey.replace(/^input\./, '')
    return inputValues[key] ?? ''
  }
  return inputValues[dataKey] ?? ''
}

async function createPlaceholderPdf(form: PdfForm): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fields = normalizeFields(form.mapping)

  page.drawText(form.institution, { x: 56, y: 778, size: 10, font: regular, color: rgb(0.25, 0.25, 0.25) })
  page.drawText(form.title, { x: 56, y: 742, size: 18, font: bold, color: rgb(0.05, 0.05, 0.05) })
  page.drawText('Formular demo generat automat cand PDF-ul oficial lipseste din Supabase Storage.', {
    x: 56,
    y: 718,
    size: 9,
    font: regular,
    color: rgb(0.45, 0.45, 0.45),
  })

  for (const item of fields) {
    page.drawText(item.label, {
      x: Math.max(56, item.x - 120),
      y: A4_HEIGHT - item.y - item.height + 4,
      size: 9,
      font: regular,
      color: rgb(0.28, 0.28, 0.28),
    })
    page.drawLine({
      start: { x: item.x, y: A4_HEIGHT - item.y - item.height + 2 },
      end: { x: item.x + item.width, y: A4_HEIGHT - item.y - item.height + 2 },
      thickness: 0.7,
      color: rgb(0.65, 0.65, 0.65),
    })
  }

  return pdf.save()
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function safeId(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
