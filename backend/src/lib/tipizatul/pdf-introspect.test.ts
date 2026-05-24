import { describe, it, expect } from 'vitest'
import { buildAcroFormFixture } from './pdf-fixture'
import { introspectAcroForm } from './pdf-introspect'

describe('introspectAcroForm', () => {
  it('classifies text/checkbox/dropdown/radio fields by their AcroForm class', async () => {
    const pdf = await buildAcroFormFixture({
      textFields: ['nume', 'cnp'],
      checkboxes: ['accept'],
      dropdowns: [{ name: 'judet', options: ['Cluj', 'Iași'] }],
      radios: [{ name: 'sex', options: ['M', 'F'] }],
    })
    const { fields, byName } = await introspectAcroForm(pdf)
    expect(fields.map((f) => [f.pdfFieldName, f.type])).toEqual(
      expect.arrayContaining([
        ['nume', 'text'],
        ['cnp', 'text'],
        ['accept', 'checkbox'],
        ['judet', 'dropdown'],
        ['sex', 'radio'],
      ])
    )
    expect(byName.get('judet')?.options).toEqual(['Cluj', 'Iași'])
    expect(byName.get('sex')?.options).toEqual(['M', 'F'])
  })

  it('returns an empty fields array for PDFs without an AcroForm', async () => {
    const pdf = await buildAcroFormFixture({})
    const { fields } = await introspectAcroForm(pdf)
    expect(fields).toEqual([])
  })

  it('assigns order matching the AcroForm tree iteration', async () => {
    const pdf = await buildAcroFormFixture({
      textFields: ['a', 'b', 'c'],
    })
    const { fields } = await introspectAcroForm(pdf)
    expect(fields.map((f) => f.order)).toEqual([0, 1, 2])
  })
})
