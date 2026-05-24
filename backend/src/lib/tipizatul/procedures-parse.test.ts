import { describe, it, expect } from 'vitest'
import { parseProceduresFeed } from './procedures-parse'

function feed() {
  return {
    builtAt: '2026-05-20T00:00:00Z',
    total: 3,
    procedures: {
      'proc-cluj-1': {
        procedureId: 'proc-cluj-1',
        title: 'Eliberare certificat fiscal',
        institution: 'Primăria Cluj-Napoca',
        county: 'Cluj',
        city: 'Cluj-Napoca',
        informational: false,
        fields: {
          descriere: 'Pentru dosar notarial',
          taxe: 'Gratuit',
          timpSolutionare: '3 zile',
        },
        documents: [
          { nr: 1, name: 'Cerere tip', required: true, downloadUrl: 'https://example/x.pdf', eDirectDocId: 'edd-1' },
        ],
        outputDocuments: [{ name: 'Certificat fiscal' }],
        laws: [{ name: 'L 227/2015' }],
      },
      'proc-national': {
        procedureId: 'proc-national',
        title: 'Cerere generală',
        informational: true,
        fields: {},
        documents: [],
      },
      // Skipped: missing procedureId AND key cannot help here because
      // it's the explicit `procedureId` lookup that fails.
      'broken': { title: '', documents: [] },
    },
  }
}

describe('parseProceduresFeed', () => {
  it('extracts builtAt and full row payloads', () => {
    const out = parseProceduresFeed(feed())
    expect(out.builtAt).toBe('2026-05-20T00:00:00Z')
    expect(out.rows).toHaveLength(2)
    expect(out.skipped).toBe(1)

    const cluj = out.rows.find((r) => r.procedure_id === 'proc-cluj-1')!
    expect(cluj.county).toBe('Cluj')
    expect(cluj.informational).toBe(false)
    expect(cluj.fields.taxe).toBe('Gratuit')
    expect(cluj.documents).toHaveLength(1)
    expect(cluj.output_documents).toEqual([{ name: 'Certificat fiscal' }])
    expect(cluj.laws).toEqual([{ name: 'L 227/2015' }])
  })

  it('falls back to map key when procedureId is missing on the inner object', () => {
    const out = parseProceduresFeed({
      builtAt: 0,
      total: 1,
      procedures: {
        'fallback-key': { title: 'X', informational: false, fields: {}, documents: [] },
      },
    })
    expect(out.rows[0].procedure_id).toBe('fallback-key')
  })

  it('skips entries with no title even when procedureId exists', () => {
    const out = parseProceduresFeed(feed())
    expect(out.rows.every((r) => r.title)).toBe(true)
    // The 'broken' entry has empty title AND no procedureId — counted as skipped.
    expect(out.rows.find((r) => r.procedure_id === 'broken')).toBeUndefined()
  })

  it('normalises a numeric builtAt to ISO string', () => {
    const out = parseProceduresFeed({ builtAt: 1700000000000, procedures: {} })
    expect(out.builtAt).toBe(new Date(1700000000000).toISOString())
  })

  it('throws on non-object feed input', () => {
    expect(() => parseProceduresFeed(null)).toThrow(/must be an object/)
    expect(() => parseProceduresFeed('nope' as unknown)).toThrow(/must be an object/)
  })

  it('preserves documents as opaque arrays (no flattening / no URL resolution)', () => {
    const out = parseProceduresFeed(feed())
    const cluj = out.rows.find((r) => r.procedure_id === 'proc-cluj-1')!
    expect(cluj.documents[0]).toEqual({
      nr: 1,
      name: 'Cerere tip',
      required: true,
      downloadUrl: 'https://example/x.pdf',
      eDirectDocId: 'edd-1',
    })
  })
})
