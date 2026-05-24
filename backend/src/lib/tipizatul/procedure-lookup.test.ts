import { describe, it, expect, vi } from 'vitest'
import { findProcedures, synthesizeActionPlan } from './procedure-lookup'
import type { Procedure } from './types'

// Mock Supabase client surface — chainable, captures the filter calls so
// tests can assert on the WHERE clause shape.

interface CallLog {
  table?: string
  filters: { op: string; args: unknown[] }[]
  rows: unknown[]
  error: { message: string } | null
}

function makeClient(rows: unknown[], error: { message: string } | null = null) {
  const log: CallLog = { filters: [], rows, error }
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  // every chainable PostgREST method records its call and returns chain
  for (const op of ['select', 'eq', 'ilike', 'or', 'is', 'order', 'limit', 'overlaps']) {
    chain[op] = (...args: unknown[]) => {
      log.filters.push({ op, args })
      return chain
    }
  }
  // Awaiting the chain returns { data, error }.
  ;(chain as unknown as { then: unknown }).then = (
    resolve: (val: { data: unknown[]; error: unknown }) => unknown,
  ) => resolve({ data: rows, error })
  const client = {
    from(table: string) {
      log.table = table
      return chain
    },
  } as never
  return { client, log }
}

describe('findProcedures — Cluj filter applied at query time', () => {
  it("uses 'county = Cluj OR county IS NULL' by default (Cluj + national)", async () => {
    const { client, log } = makeClient([
      { procedure_id: 'p1', title: 'Cerere fiscala', county: 'Cluj', informational: false, fields: {}, documents: [] },
    ])
    await findProcedures('fiscala', { client })
    expect(log.table).toBe('procedures')
    // Look for the `.or('county.eq.Cluj,county.is.null')` call.
    const orCall = log.filters.find((f) => f.op === 'or')
    expect(orCall?.args[0]).toBe('county.eq.Cluj,county.is.null')
  })

  it('uses eq when includeNational=false', async () => {
    const { client, log } = makeClient([])
    await findProcedures('x', { client, includeNational: false })
    const eqs = log.filters.filter((f) => f.op === 'eq')
    expect(eqs.find((f) => f.args[0] === 'county' && f.args[1] === 'Cluj')).toBeDefined()
  })

  it("supports county=null (national only) AND county='' (no filter at all)", async () => {
    {
      const { client, log } = makeClient([])
      await findProcedures('x', { client, county: null })
      expect(log.filters.find((f) => f.op === 'or')).toBeUndefined()
      expect(log.filters.find((f) => f.op === 'eq' && f.args[0] === 'county')).toBeUndefined()
    }
  })

  it('applies one ilike per non-stopword token (AND-of-ILIKEs)', async () => {
    const { client, log } = makeClient([])
    await findProcedures('certificat fiscal', { client })
    const ilikes = log.filters.filter((f) => f.op === 'ilike')
    expect(ilikes.map((f) => f.args)).toEqual([
      ['title', '%certificat%'],
      ['title', '%fiscal%'],
    ])
  })

  it('strips Romanian stopwords from full-sentence prompts', async () => {
    const { client, log } = makeClient([])
    await findProcedures('vreau sa construiesc o casa', { client })
    const ilikes = log.filters.filter((f) => f.op === 'ilike').map((f) => f.args[1])
    // "vreau", "sa", "o" are stopwords; "construiesc" and "casa" survive.
    expect(ilikes).toContain('%construiesc%')
    expect(ilikes).toContain('%casa%')
    expect(ilikes).not.toContain('%vreau%')
    expect(ilikes).not.toContain('%sa%')
    expect(ilikes).not.toContain('%o%')
  })

  it('falls back to raw query when every token is a stopword', async () => {
    const { client, log } = makeClient([])
    await findProcedures('de la', { client })
    const ilikes = log.filters.filter((f) => f.op === 'ilike')
    expect(ilikes).toHaveLength(1)
    expect(ilikes[0].args).toEqual(['title', '%de la%'])
  })

  it('returns [] on DB error (graceful degrade)', async () => {
    const { client } = makeClient([], { message: 'connection refused' })
    const out = await findProcedures('x', { client })
    expect(out).toEqual([])
  })
})

describe('synthesizeActionPlan', () => {
  it('skips the candidate fetch when no documents carry join keys', async () => {
    const proc: Procedure = {
      procedureId: 'p1',
      title: 'X',
      informational: false,
      fields: {},
      documents: [{ name: 'docless' }], // no eDirectDocId, no downloadUrl
    }
    const fromSpy = vi.fn()
    const client = { from: fromSpy } as never
    const out = await synthesizeActionPlan(proc, { client })
    expect(fromSpy).not.toHaveBeenCalled()
    expect(out.documents[0].form_slug).toBeNull()
    expect(out.documents[0].resolution).toBe('none')
  })

  it('attaches form_slug from a matching candidate row (edirect)', async () => {
    const proc: Procedure = {
      procedureId: 'p1',
      title: 'X',
      informational: false,
      fields: {},
      documents: [{ name: 'A', eDirectDocId: 'EDD-1' }],
    }
    const { client } = makeClient([
      {
        slug: 'tipizatul-abc',
        source: 'tipizatul',
        edirect_doc_id: 'EDD-1',
        drive_file_id: null,
        acroform_origin: 'original',
        vote_count: 5,
        synced_at: '2026-04-01',
      },
    ])
    const out = await synthesizeActionPlan(proc, { client })
    expect(out.documents[0].form_slug).toBe('tipizatul-abc')
    expect(out.documents[0].resolution).toBe('edirect_doc_id')
  })
})
