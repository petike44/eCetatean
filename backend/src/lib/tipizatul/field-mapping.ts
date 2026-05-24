import type { PdfAutofillField } from '../../types'
import type { Template, TemplateField } from './types'

/** Convert a tipizatul TemplateField into our PdfAutofillField shape.
 *  No label-guessing: dataKey defaults to `input.<safeId(pdfFieldName)>`
 *  so the field always shows up as "needs user input" until either the
 *  AI mapping endpoint or a human reviewer assigns a real profile key.
 *  This matches the live-data reality that most templates are
 *  acroFormOrigin='generated' with noisy auto-detected labels. */
export function templateFieldToAutofill(
  field: TemplateField,
  index: number
): PdfAutofillField {
  const id = safeId(field.pdfFieldName) || `field_${index + 1}`
  return {
    id,
    label: field.label || field.pdfFieldName,
    dataKey: `input.${id}`,
    page: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    required: Boolean(field.isRequired),
    confidence: typeof field.detectorConfidence === 'number'
      ? field.detectorConfidence
      : 0.5,
    source: 'acroform',
    acroFieldName: field.pdfFieldName,
  }
}

export interface MappedTemplate {
  /** Stable URL-safe slug (e.g. 'tipizatul-<id>') used as pdf_forms.slug. */
  slug: string
  title: string
  institution: string
  description: string | null
  category: string
  county: string | null
  organization: string | null
  procedure_id: string | null
  edirect_doc_id: string | null
  drive_file_id: string
  original_drive_file_id: string | null
  acroform_origin: 'original' | 'generated' | null
  source: 'tipizatul'
  source_template_id: string
  source_version: number
  vote_count: number | null
  fields_raw: TemplateField[]
  mapping: PdfAutofillField[]
  tags: string[]
}

/** True when this TemplateField belongs in the fillable `mapping` array.
 *  Mirrors upstream (schema-builder.ts skips hidden; pdf-fill.ts only fills
 *  visible). fields_raw still keeps the complete list. */
export function isFillable(field: TemplateField): boolean {
  if (field.type === 'unsupported') return false
  if (field.hidden === true) return false
  return true
}

/** Map a full tipizatul Template → row payload for pdf_forms upsert. */
export function templateToFormRow(t: Template): MappedTemplate {
  const rawFields = t.fields ?? []
  const fields = rawFields
    .filter(isFillable)
    .map(templateFieldToAutofill)
  return {
    slug: `tipizatul-${t.id}`,
    title: t.name,
    institution: t.organization ?? 'Necunoscut',
    description: t.description ?? null,
    category: t.category ?? 'general',
    county: t.county ?? null,
    organization: t.organization ?? null,
    procedure_id: t.procedureId ?? null,
    edirect_doc_id: t.eDirectDocId ?? null,
    drive_file_id: t.driveFileId,
    original_drive_file_id: t.originalDriveFileId ?? null,
    acroform_origin: t.acroFormOrigin ?? null,
    source: 'tipizatul',
    source_template_id: t.id,
    source_version: t.version ?? 1,
    vote_count: t.voteCount ?? null,
    fields_raw: rawFields,
    mapping: fields,
    tags: buildTags(t),
  }
}

function buildTags(t: Template): string[] {
  const tags = new Set<string>()
  if (t.category) tags.add(t.category)
  if (t.organization) tags.add(t.organization)
  if (t.county) tags.add(t.county)
  if (t.procedure) tags.add(t.procedure)
  return [...tags].filter(Boolean).map((s) => s.toLowerCase())
}

function safeId(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
