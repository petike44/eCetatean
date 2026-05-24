// Verifies the analyze-time enrichment that surfaces field_type / options /
// needs_review onto PdfAutofillField for tipizatul rows. The frontend
// FieldRenderer relies on exactly these three properties — if this test
// breaks, FieldRenderer falls back to a plain text input silently.

import { describe, it, expect } from 'vitest'
import { analyzePdf } from './pdf-autofill'
import type { PdfForm } from '../types'
import type { TemplateField } from './tipizatul/types'
import { buildAcroFormFixture } from './tipizatul/pdf-fixture'

function makeTipizatulForm(
  overrides: Partial<PdfForm> & { fields_raw?: TemplateField[] } = {},
): PdfForm {
  return {
    id: 'id',
    slug: 'tipizatul-x',
    title: 't',
    institution: 'i',
    description: null,
    category: 'general',
    tags: [],
    storage_bucket: 'pdf-forms',
    storage_path: 'tipizatul/x.pdf',
    source_url: null,
    mapping: [],
    required_inputs: [],
    is_active: true,
    created_at: '',
    updated_at: '',
    source: 'tipizatul',
    drive_file_id: 'x',
    acroform_origin: 'original',
    ...overrides,
  } as PdfForm
}

describe('analyzePdf — Phase 6 metadata enrichment for tipizatul', () => {
  it('surfaces field_type and options when fields_raw matches the AcroForm', async () => {
    const source = await buildAcroFormFixture({
      textFields: ['nume'],
      checkboxes: ['accept'],
      dropdowns: [{ name: 'judet', options: ['Cluj', 'Iași'] }],
      radios: [{ name: 'sex', options: ['M', 'F'] }],
    })
    const fields_raw: TemplateField[] = [
      { pdfFieldName: 'nume', type: 'text', label: 'Nume', isRequired: true },
      { pdfFieldName: 'accept', type: 'checkbox', label: 'Accept', isRequired: false },
      {
        pdfFieldName: 'judet',
        type: 'dropdown',
        label: 'Județ',
        isRequired: true,
        options: ['Cluj', 'Iași'],
      },
      { pdfFieldName: 'sex', type: 'radio', label: 'Sex', isRequired: true, options: ['M', 'F'] },
    ]
    const form = makeTipizatulForm({ fields_raw })
    const out = await analyzePdf(form, source, {})
    const by = Object.fromEntries(out.map((f) => [f.acroFieldName, f]))
    expect(by['nume'].field_type).toBe('text')
    expect(by['accept'].field_type).toBe('checkbox')
    expect(by['judet'].field_type).toBe('dropdown')
    expect(by['judet'].options).toEqual(['Cluj', 'Iași'])
    expect(by['sex'].field_type).toBe('radio')
    expect(by['sex'].options).toEqual(['M', 'F'])
  })

  it("marks needs_review=false only when acroform_origin === 'original'", async () => {
    const source = await buildAcroFormFixture({ textFields: ['nume'] })
    const fields_raw: TemplateField[] = [
      { pdfFieldName: 'nume', type: 'text', label: 'Nume', isRequired: true },
    ]
    {
      const out = await analyzePdf(
        makeTipizatulForm({ fields_raw, acroform_origin: 'original' }),
        source,
        {},
      )
      expect(out.find((f) => f.acroFieldName === 'nume')?.needs_review).toBe(false)
    }
    {
      const out = await analyzePdf(
        makeTipizatulForm({ fields_raw, acroform_origin: 'generated' }),
        source,
        {},
      )
      expect(out.find((f) => f.acroFieldName === 'nume')?.needs_review).toBe(true)
    }
    {
      const out = await analyzePdf(
        makeTipizatulForm({ fields_raw, acroform_origin: null }),
        source,
        {},
      )
      expect(out.find((f) => f.acroFieldName === 'nume')?.needs_review).toBe(true)
    }
  })

  it("does NOT add field_type/options to non-tipizatul (manual) forms", async () => {
    const source = await buildAcroFormFixture({ textFields: ['nume'] })
    const manual = makeTipizatulForm({ source: 'manual', fields_raw: undefined })
    const out = await analyzePdf(manual, source, {})
    const f = out.find((f) => f.acroFieldName === 'nume')!
    expect(f.field_type).toBeUndefined()
    expect(f.options).toBeUndefined()
    expect(f.needs_review).toBeUndefined()
  })
})
