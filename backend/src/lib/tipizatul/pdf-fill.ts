// Tipizatul AcroForm fill core.
//
// - Fills by named AcroForm field (pdfFieldName), NOT by pixel coordinates.
// - Embeds NotoSans via fontkit so Romanian diacritics render natively
//   (no ASCII latinization).
// - Trust gate: acroform_origin==='original' → silent fill + flatten.
//                acroform_origin==='generated' or null → mark needs_review,
//                fill what we can, and DO NOT flatten (the user can still
//                edit in the preview).
// - Defers signatures and any field whose introspected type is 'unsupported'
//   or whose TemplateField has hidden===true.

import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
  type PDFFont,
} from '@pdfme/pdf-lib'
// @ts-expect-error — fontkit 2.x ships no .d.ts; we only need it as an
// opaque object for pdf.registerFontkit(). It IS bundled as a transitive
// dep of @pdfme/pdf-lib.
import * as fontkit from 'fontkit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { classifyField } from './pdf-introspect'
import type { TemplateField, TemplateFieldType } from './types'

const FONT_PATH = path.join(process.cwd(), 'src', 'assets', 'NotoSans-Regular.ttf')

let cachedFontBytes: Uint8Array | null = null
function loadNotoSansBytes(): Uint8Array {
  if (cachedFontBytes) return cachedFontBytes
  cachedFontBytes = new Uint8Array(fs.readFileSync(FONT_PATH))
  return cachedFontBytes
}

export interface FillValueInput {
  pdfFieldName: string
  value: string | boolean
}

export interface FillFieldOutcome {
  pdfFieldName: string
  status: 'filled' | 'skipped' | 'needs_review' | 'error'
  reason?: string
}

export interface FillTipizatulOptions {
  /** Provided by the catalog row (pdf_forms.acroform_origin). Defaults to null. */
  acroformOrigin?: 'original' | 'generated' | null
  /** Raw template fields from pdf_forms.fields_raw — used for type + hidden + options. */
  fieldsRaw?: TemplateField[]
  /** Override the font bytes (testing). */
  fontBytes?: Uint8Array
}

export interface FillTipizatulResult {
  pdf: Uint8Array
  outcomes: FillFieldOutcome[]
  /** True when the trust gate left the form unflattened for human review. */
  needsReview: boolean
}

/** Trust gate predicate. Exposed for tests. */
export function shouldFlatten(origin: 'original' | 'generated' | null | undefined): boolean {
  return origin === 'original'
}

/** Lookup {pdfFieldName → TemplateField} from a TemplateField[] (fields_raw). */
function indexTemplateFields(fields?: TemplateField[]): Map<string, TemplateField> {
  const map = new Map<string, TemplateField>()
  for (const f of fields ?? []) {
    if (f && typeof f.pdfFieldName === 'string') map.set(f.pdfFieldName, f)
  }
  return map
}

/** Fill a tipizatul-sourced PDF by named AcroForm fields. */
export async function fillTipizatulPdf(
  sourcePdf: Uint8Array,
  values: FillValueInput[],
  opts: FillTipizatulOptions = {}
): Promise<FillTipizatulResult> {
  const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true })
  pdf.registerFontkit(fontkit as unknown as Parameters<typeof pdf.registerFontkit>[0])

  const fontBytes = opts.fontBytes ?? loadNotoSansBytes()
  const font: PDFFont = await pdf.embedFont(fontBytes, { subset: true })

  const form = pdf.getForm()
  const tplIndex = indexTemplateFields(opts.fieldsRaw)
  const outcomes: FillFieldOutcome[] = []
  const willFlatten = shouldFlatten(opts.acroformOrigin)

  for (const { pdfFieldName, value } of values) {
    const tpl = tplIndex.get(pdfFieldName)
    if (tpl?.hidden === true) {
      outcomes.push({ pdfFieldName, status: 'skipped', reason: 'hidden' })
      continue
    }

    let field
    try {
      field = form.getField(pdfFieldName)
    } catch (err) {
      outcomes.push({
        pdfFieldName,
        status: 'error',
        reason: err instanceof Error ? err.message : 'field not found',
      })
      continue
    }

    // Type discriminator: prefer the raw template (it knows about
    // 'unsupported') but fall back to live introspection.
    const type: TemplateFieldType = tpl?.type ?? classifyField(field)
    if (type === 'unsupported') {
      outcomes.push({ pdfFieldName, status: 'skipped', reason: 'unsupported' })
      continue
    }

    try {
      const status = applyValue(field, type, value, tpl)
      outcomes.push({
        pdfFieldName,
        status: willFlatten ? status : status === 'filled' ? 'needs_review' : status,
      })
    } catch (err) {
      outcomes.push({
        pdfFieldName,
        status: 'error',
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  try {
    form.updateFieldAppearances(font)
  } catch {
    // Some PDFs have malformed widget annotations; appearances will still be
    // computed lazily by viewers.
  }

  if (willFlatten) {
    try {
      form.flatten()
    } catch {
      // No valid AcroForm tree — bytes still come out below.
    }
  }

  return {
    pdf: new Uint8Array(await pdf.save()),
    outcomes,
    needsReview: !willFlatten,
  }
}

function applyValue(
  field: ReturnType<ReturnType<PDFDocument['getForm']>['getField']>,
  type: TemplateFieldType,
  raw: string | boolean,
  tpl: TemplateField | undefined
): 'filled' | 'skipped' {
  if (type === 'text') {
    if (!(field instanceof PDFTextField)) throw new Error('field type mismatch: expected text')
    const text = String(raw ?? '')
    if (!text) return 'skipped'
    field.setText(text)
    if (tpl?.maxLength) field.setMaxLength(tpl.maxLength)
    return 'filled'
  }

  if (type === 'checkbox') {
    if (!(field instanceof PDFCheckBox)) throw new Error('field type mismatch: expected checkbox')
    const truthy = raw === true || raw === 'true' || raw === '1' || raw === 'on'
    if (truthy) field.check()
    else field.uncheck()
    return 'filled'
  }

  if (type === 'dropdown') {
    if (field instanceof PDFDropdown) {
      const v = String(raw ?? '')
      if (!v) return 'skipped'
      field.select(v)
      return 'filled'
    }
    if (field instanceof PDFOptionList) {
      const v = String(raw ?? '')
      if (!v) return 'skipped'
      field.select(v)
      return 'filled'
    }
    throw new Error('field type mismatch: expected dropdown')
  }

  if (type === 'radio') {
    if (!(field instanceof PDFRadioGroup)) throw new Error('field type mismatch: expected radio')
    const v = String(raw ?? '')
    if (!v) return 'skipped'
    field.select(v)
    return 'filled'
  }

  return 'skipped'
}
