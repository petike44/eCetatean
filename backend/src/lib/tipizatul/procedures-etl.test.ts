import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncProcedures } from './procedures-etl'

type UpsertResult = { error: null | { message: string } }
const upsertSpy = vi.fn<(payload: unknown[]) => Promise<UpsertResult>>(
  async () => ({ error: null })
)

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      upsert: (payload: unknown[]) => upsertSpy(payload),
    })),
  },
}))

function makeFeed(n: number) {
  const procedures: Record<string, unknown> = {}
  for (let i = 0; i < n; i++) {
    procedures[`p-${i}`] = {
      procedureId: `p-${i}`,
      title: `Proc ${i}`,
      county: i % 2 === 0 ? 'Cluj' : 'Iași',
      informational: false,
      fields: {},
      documents: [],
    }
  }
  return { builtAt: '2026-05-20T00:00:00Z', total: n, procedures }
}

describe('syncProcedures', () => {
  beforeEach(() => upsertSpy.mockClear())
  afterEach(() => vi.restoreAllMocks())

  it('imports the full feed (no county filter at ETL time)', async () => {
    const feed = makeFeed(5)
    const result = await syncProcedures({
      fetcher: async () => feed,
      batchSize: 10,
    })

    expect(result.totalInFeed).toBe(5)
    expect(result.upserted).toBe(5)
    expect(result.skipped).toBe(0)

    const allRows = upsertSpy.mock.calls.flatMap(
      (call) => call[0] as { county: string }[]
    )
    expect(allRows).toHaveLength(5)
    expect(allRows.map((r) => r.county).sort()).toEqual(['Cluj', 'Cluj', 'Cluj', 'Iași', 'Iași'])
  })

  it('chunks upserts according to batchSize', async () => {
    const feed = makeFeed(7)
    await syncProcedures({
      fetcher: async () => feed,
      batchSize: 3,
    })
    // 7 rows / batchSize 3 → 3 batches of sizes [3, 3, 1]
    expect(upsertSpy).toHaveBeenCalledTimes(3)
    expect(upsertSpy.mock.calls[0][0].length).toBe(3)
    expect(upsertSpy.mock.calls[1][0].length).toBe(3)
    expect(upsertSpy.mock.calls[2][0].length).toBe(1)
  })

  it('respects --limit', async () => {
    const feed = makeFeed(20)
    const result = await syncProcedures({
      fetcher: async () => feed,
      limit: 4,
      batchSize: 10,
    })
    expect(result.upserted).toBe(4)
    expect(result.totalInFeed).toBe(20)
  })

  it('captures upsert errors per batch without crashing the whole sync', async () => {
    upsertSpy
      .mockResolvedValueOnce({ error: { message: 'first batch boom' } })
      .mockResolvedValueOnce({ error: null })
    const feed = makeFeed(4)
    const result = await syncProcedures({
      fetcher: async () => feed,
      batchSize: 2,
    })
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/first batch boom/)
    expect(result.upserted).toBe(2) // only the second batch succeeded
  })
})
