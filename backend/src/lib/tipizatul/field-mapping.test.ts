import { describe, it, expect } from 'vitest'
import {
  templateFieldToAutofill,
  templateToFormRow,
} from './field-mapping'
import type { Template, TemplateField } from './types'

describe('templateFieldToAutofill', () => {
  it('preserves pdfFieldName as acroFieldName and derives a safe id', () => {
    const field: TemplateField = {
      pdfFieldName: 'Nume si Prenume',
      type: 'text',
      label: 'Nume și prenume',
      isRequired: true,
    }
    const out = templateFieldToAutofill(field, 0)
    expect(out.acroFieldName).toBe('Nume si Prenume')
    expect(out.id).toBe('nume_si_prenume')
    expect(out.dataKey).toBe('input.nume_si_prenume')
    expect(out.required).toBe(true)
    expect(out.source).toBe('acroform')
  })

  it('falls back to label when given empty pdfFieldName', () => {
    const out = templateFieldToAutofill(
      { pdfFieldName: '', type: 'text', label: 'X', isRequired: false },
      2
    )
    expect(out.id).toBe('field_3')
  })

  it('uses detectorConfidence when present (generated acroform)', () => {
    const out = templateFieldToAutofill(
      {
        pdfFieldName: 'f1',
        type: 'text',
        label: 'Auto detected',
        isRequired: false,
        detectorConfidence: 0.42,
      },
      0
    )
    expect(out.confidence).toBeCloseTo(0.42)
  })

  it('defaults confidence to 0.5 when no detectorConfidence', () => {
    const out = templateFieldToAutofill(
      { pdfFieldName: 'f1', type: 'text', label: 'L', isRequired: false },
      0
    )
    expect(out.confidence).toBe(0.5)
  })

  it('never auto-maps to a profile.* dataKey (needs_review is primary path)', () => {
    // Even for fields whose label SCREAMS "CNP", the ETL must not silently
    // map them to profile.cnp — only AI-mapping or human review should.
    const out = templateFieldToAutofill(
      { pdfFieldName: 'CNP', type: 'text', label: 'CNP', isRequired: true },
      0
    )
    expect(out.dataKey).toMatch(/^input\./)
    expect(out.dataKey).not.toContain('profile.')
  })
})

describe('templateToFormRow', () => {
  const baseTemplate: Template = {
    id: 'tpl-xyz',
    name: 'Cerere viza flotant',
    description: 'Solicit viza de flotant',
    category: 'evidenta',
    organization: 'DGEP Cluj',
    county: 'Cluj',
    procedure: 'Stabilire reședință',
    procedureId: 'proc-123',
    eDirectDocId: 'edd-77',
    version: 4,
    createdAt: 0,
    driveFileId: 'drv-abc',
    originalDriveFileId: 'drv-orig',
    acroFormOrigin: 'original',
    voteCount: 12,
    fields: [
      { pdfFieldName: 'Nume', type: 'text', label: 'Nume', isRequired: true },
      {
        pdfFieldName: 'sex',
        type: 'radio',
        label: 'Sex',
        isRequired: true,
        options: ['M', 'F'],
      },
    ],
  }

  it('produces a stable slug, county, and source metadata', () => {
    const row = templateToFormRow(baseTemplate)
    expect(row.slug).toBe('tipizatul-tpl-xyz')
    expect(row.county).toBe('Cluj')           // full name (per live data)
    expect(row.source).toBe('tipizatul')
    expect(row.source_template_id).toBe('tpl-xyz')
    expect(row.source_version).toBe(4)
    expect(row.drive_file_id).toBe('drv-abc')
    expect(row.original_drive_file_id).toBe('drv-orig')
    expect(row.acroform_origin).toBe('original')
    expect(row.procedure_id).toBe('proc-123')
    expect(row.edirect_doc_id).toBe('edd-77')
  })

  it('persists fields_raw verbatim so we can re-derive mapping later', () => {
    const row = templateToFormRow(baseTemplate)
    expect(row.fields_raw).toHaveLength(2)
    expect(row.fields_raw[1].options).toEqual(['M', 'F'])
  })

  it('emits one PdfAutofillField per TemplateField in order', () => {
    const row = templateToFormRow(baseTemplate)
    expect(row.mapping).toHaveLength(2)
    expect(row.mapping[0].acroFieldName).toBe('Nume')
    expect(row.mapping[1].acroFieldName).toBe('sex')
  })

  it('falls back gracefully when optional metadata is missing', () => {
    const minimal: Template = {
      id: 'min',
      name: 'X',
      version: 1,
      createdAt: 0,
      driveFileId: 'drv-x',
      fields: [],
    }
    const row = templateToFormRow(minimal)
    expect(row.institution).toBe('Necunoscut')
    expect(row.category).toBe('general')
    expect(row.county).toBeNull()
    expect(row.acroform_origin).toBeNull()
    expect(row.mapping).toHaveLength(0)
  })

  it('builds lowercase tags from category/organization/county/procedure', () => {
    const row = templateToFormRow(baseTemplate)
    expect(row.tags).toEqual(expect.arrayContaining(['evidenta', 'dgep cluj', 'cluj', 'stabilire reședință']))
  })

  it('excludes unsupported and hidden fields from mapping but keeps them in fields_raw', () => {
    const tpl: Template = {
      id: 'tpl-mix',
      name: 'Mix',
      version: 1,
      createdAt: 0,
      driveFileId: 'drv-mix',
      fields: [
        { pdfFieldName: 'visible_text', type: 'text', label: 'Visible', isRequired: true },
        { pdfFieldName: 'sig_1', type: 'unsupported', label: 'Signature', isRequired: false },
        { pdfFieldName: 'internal_flag', type: 'text', label: 'Hidden flag', isRequired: false, hidden: true },
        { pdfFieldName: 'consent', type: 'checkbox', label: 'Consent', isRequired: true },
      ],
    }
    const row = templateToFormRow(tpl)

    expect(row.mapping.map((f) => f.acroFieldName)).toEqual(['visible_text', 'consent'])
    expect(row.fields_raw).toHaveLength(4)
    expect(row.fields_raw.map((f) => f.pdfFieldName)).toEqual([
      'visible_text',
      'sig_1',
      'internal_flag',
      'consent',
    ])
  })
})
