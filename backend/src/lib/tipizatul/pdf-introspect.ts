// Walk a PDF's AcroForm tree and classify each field into one of the
// TemplateFieldType buckets, so the fill core can dispatch on a single
// discriminator regardless of where the type info came from (live
// introspection vs. tipizatul's fields_raw).
//
// Port of upstream pdf-introspect.ts. We intentionally key off the
// pdf-lib runtime classes (PDFTextField, PDFCheckBox, ...) rather than
// poking at low-level acroField widgets — pdf-lib already normalises
// the dictionary differences for us.

import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFSignature,
  PDFOptionList,
  type PDFField,
} from '@pdfme/pdf-lib'
import type { TemplateFieldType } from './types'

export interface IntrospectedField {
  pdfFieldName: string
  type: TemplateFieldType
  /** Multi-select option lists collapse to dropdown with isMultiline-ish semantics; we keep options. */
  options?: string[]
  /** True for AcroForm fields the schema explicitly flags as read-only. */
  readOnly?: boolean
  /** Field index (insertion order from getFields()). Stable per PDFDocument instance. */
  order: number
}

/** Build a {pdfFieldName → IntrospectedField} index. */
export async function introspectAcroForm(
  sourcePdf: Uint8Array
): Promise<{ fields: IntrospectedField[]; byName: Map<string, IntrospectedField> }> {
  const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true })
  const form = pdf.getForm()
  const fields = form.getFields()
  const out: IntrospectedField[] = fields.map((field, index) => ({
    pdfFieldName: field.getName(),
    type: classify(field),
    options: extractOptions(field),
    readOnly: safeIsReadOnly(field),
    order: index,
  }))
  const byName = new Map(out.map((f) => [f.pdfFieldName, f] as const))
  return { fields: out, byName }
}

/** Synchronous variant for callers that already hold a PDFDocument. */
export function classifyField(field: PDFField): TemplateFieldType {
  return classify(field)
}

function classify(field: PDFField): TemplateFieldType {
  if (field instanceof PDFTextField) return 'text'
  if (field instanceof PDFCheckBox) return 'checkbox'
  if (field instanceof PDFRadioGroup) return 'radio'
  if (field instanceof PDFDropdown) return 'dropdown'
  if (field instanceof PDFOptionList) return 'dropdown'
  if (field instanceof PDFSignature) return 'unsupported'
  // Buttons + anything else we don't know how to render → unsupported.
  return 'unsupported'
}

function extractOptions(field: PDFField): string[] | undefined {
  if (field instanceof PDFDropdown) return field.getOptions()
  if (field instanceof PDFOptionList) return field.getOptions()
  if (field instanceof PDFRadioGroup) return field.getOptions()
  return undefined
}

function safeIsReadOnly(field: PDFField): boolean {
  try {
    return field.isReadOnly()
  } catch {
    return false
  }
}
