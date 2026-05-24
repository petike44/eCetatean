import { describe, expect, it } from 'vitest'
import { PDFDocument } from '@pdfme/pdf-lib'
import { analyzePdf, resolveDataKey } from './pdf-autofill'
import type { PdfForm, Profile } from '../types'

describe('analyzePdf', () => {
  it('keeps reviewed saved dataKey mappings when native PDF fields exist', async () => {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595, 842])
    pdf.getForm().createTextField('CNP').addToPage(page, {
      x: 100,
      y: 700,
      width: 180,
      height: 18,
    })
    const sourcePdf = await pdf.save()

    const form: PdfForm = {
      id: 'form-1',
      slug: 'test-form',
      title: 'Test form',
      institution: 'Test',
      description: null,
      category: 'test',
      tags: [],
      storage_bucket: 'pdf-forms',
      storage_path: 'test.pdf',
      source_url: null,
      mapping: [
        {
          id: 'cnp',
          label: 'CNP',
          dataKey: 'input.reviewed_cnp',
          page: 0,
          x: 120,
          y: 140,
          width: 160,
          height: 18,
          required: true,
          confidence: 0.9,
          source: 'saved',
        },
      ],
      required_inputs: [],
      is_active: true,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    }

    const fields = await analyzePdf(
      form,
      sourcePdf,
      { cnp: '1900101123456' },
      { reviewed_cnp: 'manual-value' }
    )

    expect(fields).toHaveLength(1)
    expect(fields[0]?.dataKey).toBe('input.reviewed_cnp')
    expect(fields[0]?.value).toBe('manual-value')
    expect(fields[0]?.acroFieldName).toBe('CNP')
  })
})

describe('resolveDataKey', () => {
  const profile: Partial<Profile> = {
    full_name: 'Ion Popescu',
    cnp: '1900101123456',
    address: 'Str. Memorandumului 1',
    city: 'Cluj-Napoca',
    buletin_series: 'CJ',
    buletin_number: '123456',
  }

  it('resolves shared profile aliases used by catalog mappings', () => {
    expect(resolveDataKey('profile.full_address', profile, {})).toBe('Str. Memorandumului 1, Cluj-Napoca')
    expect(resolveDataKey('profile.identity_card', profile, {})).toBe('CJ 123456')
    expect(resolveDataKey('profile.cnp', profile, {})).toBe('1900101123456')
  })
})
