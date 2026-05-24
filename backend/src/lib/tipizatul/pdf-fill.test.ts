import { describe, it, expect } from 'vitest'
import { PDFDocument } from '@pdfme/pdf-lib'
import { buildAcroFormFixture } from './pdf-fixture'
import { fillTipizatulPdf, shouldFlatten } from './pdf-fill'
import type { TemplateField } from './types'

async function readBack(pdf: Uint8Array) {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: true })
  return doc.getForm()
}

describe('shouldFlatten (trust gate)', () => {
  it("flattens only when acroform_origin === 'original'", () => {
    expect(shouldFlatten('original')).toBe(true)
    expect(shouldFlatten('generated')).toBe(false)
    expect(shouldFlatten(null)).toBe(false)
    expect(shouldFlatten(undefined)).toBe(false)
  })
})

describe('fillTipizatulPdf — typed dispatch', () => {
  it('fills text, checkbox, dropdown, and radio by name', async () => {
    const source = await buildAcroFormFixture({
      textFields: ['nume'],
      checkboxes: ['accept'],
      dropdowns: [{ name: 'judet', options: ['Cluj', 'Iași'] }],
      radios: [{ name: 'sex', options: ['M', 'F'] }],
    })
    const fieldsRaw: TemplateField[] = [
      { pdfFieldName: 'nume', type: 'text', label: 'Nume', isRequired: true },
      { pdfFieldName: 'accept', type: 'checkbox', label: 'Accept', isRequired: false },
      { pdfFieldName: 'judet', type: 'dropdown', label: 'Județ', isRequired: true, options: ['Cluj', 'Iași'] },
      { pdfFieldName: 'sex', type: 'radio', label: 'Sex', isRequired: true, options: ['M', 'F'] },
    ]
    const result = await fillTipizatulPdf(
      source,
      [
        { pdfFieldName: 'nume', value: 'Ioniță Țăndără' },     // diacritics
        { pdfFieldName: 'accept', value: 'true' },
        { pdfFieldName: 'judet', value: 'Cluj' },
        { pdfFieldName: 'sex', value: 'F' },
      ],
      { acroformOrigin: 'original', fieldsRaw }
    )

    // Trust gate said 'original' → flattened, no needs_review.
    expect(result.needsReview).toBe(false)
    expect(result.outcomes.map((o) => [o.pdfFieldName, o.status])).toEqual([
      ['nume', 'filled'],
      ['accept', 'filled'],
      ['judet', 'filled'],
      ['sex', 'filled'],
    ])

    // After flatten() there are no more fillable AcroForm fields.
    const formAfter = await readBack(result.pdf)
    expect(formAfter.getFields()).toHaveLength(0)
  })

  it("does NOT flatten when acroform_origin is 'generated' and reports needs_review", async () => {
    const source = await buildAcroFormFixture({ textFields: ['x'] })
    const result = await fillTipizatulPdf(
      source,
      [{ pdfFieldName: 'x', value: 'hello' }],
      { acroformOrigin: 'generated' }
    )
    expect(result.needsReview).toBe(true)
    expect(result.outcomes[0]).toEqual({ pdfFieldName: 'x', status: 'needs_review' })
    // Field stays editable for the preview to honour.
    const formAfter = await readBack(result.pdf)
    expect(formAfter.getFields().map((f) => f.getName())).toEqual(['x'])
  })

  it("treats null acroform_origin the same as 'generated' (needs_review)", async () => {
    const source = await buildAcroFormFixture({ textFields: ['x'] })
    const result = await fillTipizatulPdf(
      source,
      [{ pdfFieldName: 'x', value: 'v' }],
      { acroformOrigin: null }
    )
    expect(result.needsReview).toBe(true)
    expect(result.outcomes[0].status).toBe('needs_review')
  })

  it("skips fields whose TemplateField has hidden===true", async () => {
    const source = await buildAcroFormFixture({ textFields: ['secret', 'shown'] })
    const fieldsRaw: TemplateField[] = [
      { pdfFieldName: 'secret', type: 'text', label: 'Secret', isRequired: false, hidden: true },
      { pdfFieldName: 'shown', type: 'text', label: 'Shown', isRequired: false },
    ]
    const result = await fillTipizatulPdf(
      source,
      [
        { pdfFieldName: 'secret', value: 'no' },
        { pdfFieldName: 'shown', value: 'yes' },
      ],
      { acroformOrigin: 'original', fieldsRaw }
    )
    const outcomes = Object.fromEntries(result.outcomes.map((o) => [o.pdfFieldName, o]))
    expect(outcomes['secret'].status).toBe('skipped')
    expect(outcomes['secret'].reason).toBe('hidden')
    expect(outcomes['shown'].status).toBe('filled')
  })

  it("skips fields whose TemplateField type is 'unsupported' (signature fields)", async () => {
    const source = await buildAcroFormFixture({ textFields: ['sig_text_placeholder'] })
    const fieldsRaw: TemplateField[] = [
      { pdfFieldName: 'sig_text_placeholder', type: 'unsupported', label: 'Sig', isRequired: false },
    ]
    const result = await fillTipizatulPdf(
      source,
      [{ pdfFieldName: 'sig_text_placeholder', value: 'signed' }],
      { acroformOrigin: 'original', fieldsRaw }
    )
    expect(result.outcomes[0]).toEqual({
      pdfFieldName: 'sig_text_placeholder',
      status: 'skipped',
      reason: 'unsupported',
    })
  })

  it("reports 'error' for unknown field names without crashing the batch", async () => {
    const source = await buildAcroFormFixture({ textFields: ['exists'] })
    const result = await fillTipizatulPdf(
      source,
      [
        { pdfFieldName: 'ghost', value: 'x' },
        { pdfFieldName: 'exists', value: 'y' },
      ],
      { acroformOrigin: 'original' }
    )
    const outcomes = Object.fromEntries(result.outcomes.map((o) => [o.pdfFieldName, o]))
    expect(outcomes['ghost'].status).toBe('error')
    expect(outcomes['exists'].status).toBe('filled')
  })

  it("preserves Romanian diacritics in the rendered text (smoke check)", async () => {
    // We can't reliably re-extract text from a flattened PDF without
    // a heavier dep, but we CAN confirm pdf-lib accepts the string
    // without throwing — i.e. NotoSans glyphs are available. The old
    // Helvetica path would throw 'WinAnsi cannot encode' on 'ț'.
    const source = await buildAcroFormFixture({ textFields: ['n'] })
    await expect(
      fillTipizatulPdf(
        source,
        [{ pdfFieldName: 'n', value: 'ăâîșț ĂÂÎȘȚ' }],
        { acroformOrigin: 'original' }
      )
    ).resolves.toMatchObject({ needsReview: false })
  })
})
