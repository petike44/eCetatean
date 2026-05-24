// Verifies that the source-discriminator in the existing fillPdf()
// routes tipizatul rows through the new AcroForm core (flattened,
// no editable fields left when origin='original') while still leaving
// demo/legacy callers on the unchanged overlay path.

import { describe, it, expect } from 'vitest'
import { PDFDocument } from '@pdfme/pdf-lib'
import { buildAcroFormFixture } from './pdf-fixture'
import { fillPdf } from '../pdf-autofill'
import type { PdfForm, PdfAutofillField } from '../../types'

function tipizatulForm(extra: Partial<PdfForm> = {}): PdfForm {
  return {
    id: 'id-1',
    slug: 'tipizatul-test',
    title: 'T',
    institution: 'I',
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
    ...extra,
  }
}

const field = (acroFieldName: string, value: string): PdfAutofillField => ({
  id: acroFieldName,
  label: acroFieldName,
  dataKey: `input.${acroFieldName}`,
  page: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  required: false,
  confidence: 1,
  source: 'acroform',
  acroFieldName,
  value,
})

describe('fillPdf — source-based path selection', () => {
  it('tipizatul + original → uses AcroForm core and flattens', async () => {
    const source = await buildAcroFormFixture({ textFields: ['nume'] })
    const out = await fillPdf(
      source,
      [field('nume', 'Țăndără')],
      {},
      {},
      tipizatulForm({ acroform_origin: 'original' })
    )
    const doc = await PDFDocument.load(new Uint8Array(out), { ignoreEncryption: true })
    expect(doc.getForm().getFields()).toHaveLength(0)
  })

  it('tipizatul + generated → uses AcroForm core but DOES NOT flatten', async () => {
    const source = await buildAcroFormFixture({ textFields: ['nume'] })
    const out = await fillPdf(
      source,
      [field('nume', 'Țăndără')],
      {},
      {},
      tipizatulForm({ acroform_origin: 'generated' })
    )
    const doc = await PDFDocument.load(new Uint8Array(out), { ignoreEncryption: true })
    expect(doc.getForm().getFields().map((f) => f.getName())).toEqual(['nume'])
  })

  it('no form arg (legacy/demo caller) → unchanged path, still flattens', async () => {
    const source = await buildAcroFormFixture({ textFields: ['nume'] })
    // No `form` passed at all — old call signature. Should still work.
    const out = await fillPdf(source, [field('nume', 'Ana')], {}, {})
    const doc = await PDFDocument.load(new Uint8Array(out), { ignoreEncryption: true })
    expect(doc.getForm().getFields()).toHaveLength(0)
  })

  it("form.source === 'manual' → legacy path (flattens via pdfForm.flatten())", async () => {
    const source = await buildAcroFormFixture({ textFields: ['nume'] })
    const out = await fillPdf(
      source,
      [field('nume', 'Ana')],
      {},
      {},
      tipizatulForm({ source: 'manual', acroform_origin: null })
    )
    const doc = await PDFDocument.load(new Uint8Array(out), { ignoreEncryption: true })
    expect(doc.getForm().getFields()).toHaveLength(0)
  })
})
