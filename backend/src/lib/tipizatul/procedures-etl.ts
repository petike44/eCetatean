import { supabaseAdmin } from '../supabase'
import { parseProceduresFeed, type ParsedProcedure } from './procedures-parse'

const DEFAULT_FEED_URL = 'https://tipizatul-eu.vercel.app/procedures.json'

export interface ProceduresSyncOptions {
  /** Override the feed URL (for tests / staging). */
  feedUrl?: string
  /** Inject a fetcher (for tests). */
  fetcher?: (url: string) => Promise<unknown>
  /** Limit number of procedures upserted (smoke test). */
  limit?: number
  /** Batch size for Supabase upsert chunks. */
  batchSize?: number
  onProgress?: (done: number, total: number) => void
}

export interface ProceduresSyncResult {
  feedUrl: string
  builtAt: string | null
  totalInFeed: number
  upserted: number
  skipped: number
  errors: string[]
}

async function defaultFetcher(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/** Pull procedures.json and upsert the full national catalog (~3.5k rows).
 *  No county filtering — that happens at query time. Idempotent on
 *  procedure_id. */
export async function syncProcedures(
  opts: ProceduresSyncOptions = {}
): Promise<ProceduresSyncResult> {
  const {
    feedUrl = DEFAULT_FEED_URL,
    fetcher = defaultFetcher,
    limit,
    batchSize = 200,
    onProgress,
  } = opts

  const feed = await fetcher(feedUrl)
  const { builtAt, rows, skipped } = parseProceduresFeed(feed)
  const slice = typeof limit === 'number' ? rows.slice(0, limit) : rows

  const result: ProceduresSyncResult = {
    feedUrl,
    builtAt,
    totalInFeed: rows.length,
    upserted: 0,
    skipped,
    errors: [],
  }

  for (let i = 0; i < slice.length; i += batchSize) {
    const chunk = slice.slice(i, i + batchSize)
    try {
      await upsertBatch(chunk)
      result.upserted += chunk.length
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err))
    }
    onProgress?.(Math.min(i + batchSize, slice.length), slice.length)
  }

  return result
}

async function upsertBatch(chunk: ParsedProcedure[]): Promise<void> {
  const now = new Date().toISOString()
  const payload = chunk.map((row) => ({
    procedure_id: row.procedure_id,
    title: row.title,
    institution: row.institution,
    county: row.county,
    city: row.city,
    informational: row.informational,
    fields: row.fields,
    documents: row.documents,
    output_documents: row.output_documents,
    laws: row.laws,
    built_at: row.built_at,
    synced_at: now,
  }))

  const { error } = await supabaseAdmin
    .from('procedures')
    .upsert(payload, { onConflict: 'procedure_id' })

  if (error) throw new Error(`procedures upsert: ${error.message}`)
}
