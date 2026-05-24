import type { Procedure, ProceduresFeed } from './types'

export interface ParsedProcedure {
  procedure_id: string
  title: string
  institution: string | null
  county: string | null
  city: string | null
  informational: boolean
  fields: Record<string, string | undefined>
  documents: unknown[]
  output_documents: unknown[]
  laws: unknown[]
  built_at: string | null
}

/** Parse the procedures.json feed into row payloads ready for upsert.
 *  Pure — no network, no DB. Skips entries with no procedureId or title. */
export function parseProceduresFeed(feed: unknown): {
  builtAt: string | null
  rows: ParsedProcedure[]
  skipped: number
} {
  if (!feed || typeof feed !== 'object') {
    throw new Error('procedures feed must be an object')
  }

  const f = feed as Partial<ProceduresFeed>
  const builtAt = normaliseBuiltAt(f.builtAt)
  const procedures = (f.procedures ?? {}) as Record<string, Procedure>

  const rows: ParsedProcedure[] = []
  let skipped = 0

  for (const [key, proc] of Object.entries(procedures)) {
    if (!proc || typeof proc !== 'object') {
      skipped++
      continue
    }
    const procedureId = proc.procedureId ?? key
    if (!procedureId || !proc.title) {
      skipped++
      continue
    }
    rows.push({
      procedure_id: procedureId,
      title: proc.title,
      institution: proc.institution ?? null,
      county: proc.county ?? null,
      city: proc.city ?? null,
      informational: Boolean(proc.informational),
      fields: proc.fields ?? {},
      documents: Array.isArray(proc.documents) ? proc.documents : [],
      output_documents: Array.isArray(proc.outputDocuments) ? proc.outputDocuments : [],
      laws: Array.isArray(proc.laws) ? proc.laws : [],
      built_at: builtAt,
    })
  }

  return { builtAt, rows, skipped }
}

function normaliseBuiltAt(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return new Date(value).toISOString()
  return null
}
