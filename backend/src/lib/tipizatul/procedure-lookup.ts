// Query the `procedures` table for a relevant Romanian admin procedure,
// then synthesize an action plan that includes:
//   - required documents (with form_slug when we have a fillable template)
//   - taxe / timpSolutionare / caiDeAtac / institutiaResponsabila
//   - legal basis (laws)
//
// Cluj filter is applied at QUERY time (county = 'Cluj' OR county IS NULL),
// toggleable via opts.county. Default is 'Cluj' to match the demo audience.

import { supabaseAdmin } from '../supabase'
import {
  joinKeysForDocuments,
  resolveProcedureDocuments,
  type PdfFormCandidate,
  type ResolvedDocument,
} from './procedure-resolve'
import type {
  Procedure,
  ProcedureDocument,
  ProcedureFields,
  ProcedureLaw,
  ProcedureOutputDocument,
} from './types'

export interface ProcedureLookupOptions {
  county?: string | null
  /** When true, also return procedures where county === null (national). */
  includeNational?: boolean
  limit?: number
  /** Inject a custom Supabase client (tests). */
  client?: typeof supabaseAdmin
}

export interface SynthesizedActionPlan {
  procedure_id: string
  title: string
  institution: string | null
  county: string | null
  city: string | null
  informational: boolean
  fields: ProcedureFields
  documents: ResolvedDocument[]
  output_documents: ProcedureOutputDocument[]
  laws: ProcedureLaw[]
}

// ─── DB row shape (mirrors Phase 2 schema) ───────────────────────

interface ProcedureRow {
  procedure_id: string
  title: string
  institution: string | null
  county: string | null
  city: string | null
  informational: boolean | null
  fields: ProcedureFields | null
  documents: ProcedureDocument[] | null
  output_documents: ProcedureOutputDocument[] | null
  laws: ProcedureLaw[] | null
}

function rowToProcedure(row: ProcedureRow): Procedure {
  return {
    procedureId: row.procedure_id,
    title: row.title,
    institution: row.institution ?? undefined,
    county: row.county ?? undefined,
    city: row.city ?? undefined,
    informational: Boolean(row.informational),
    fields: row.fields ?? {},
    documents: Array.isArray(row.documents) ? row.documents : [],
    outputDocuments: Array.isArray(row.output_documents) ? row.output_documents : [],
    laws: Array.isArray(row.laws) ? row.laws : [],
  }
}

/** Search the procedures table by a free-text query (trigram on title).
 *  Apply Cluj filter at query time by default. */
export async function findProcedures(
  query: string,
  opts: ProcedureLookupOptions = {}
): Promise<Procedure[]> {
  const client = opts.client ?? supabaseAdmin
  const county = opts.county === undefined ? 'Cluj' : opts.county
  const includeNational = opts.includeNational ?? true
  const limit = opts.limit ?? 10

  let q = client.from('procedures').select('*').limit(limit)

  // Trigram-aware partial match. ilike works on top of the pg_trgm index
  // (the index speeds up '%term%' ILIKE queries on title via gin_trgm_ops).
  const trimmed = query.trim()
  if (trimmed) {
    q = q.ilike('title', `%${trimmed}%`)
  }

  // County filter
  if (county) {
    if (includeNational) {
      // Match county = <county> OR county IS NULL
      q = q.or(`county.eq.${county},county.is.null`)
    } else {
      q = q.eq('county', county)
    }
  }

  const { data, error } = await q
  if (error) {
    console.warn('findProcedures failed:', error.message)
    return []
  }
  return ((data ?? []) as ProcedureRow[]).map(rowToProcedure)
}

/** Resolve the documents of a procedure against pdf_forms, returning a
 *  ready-to-render action plan. Bulk-fetches the candidate forms in one
 *  query keyed by edirect_doc_id + drive_file_id. */
export async function synthesizeActionPlan(
  procedure: Procedure,
  opts: { client?: typeof supabaseAdmin } = {}
): Promise<SynthesizedActionPlan> {
  const client = opts.client ?? supabaseAdmin
  const documents = procedure.documents ?? []
  const { edirectDocIds, driveFileIds } = joinKeysForDocuments(documents)

  let candidates: PdfFormCandidate[] = []
  if (edirectDocIds.length || driveFileIds.length) {
    const filters: string[] = []
    if (edirectDocIds.length) {
      filters.push(`edirect_doc_id.in.(${edirectDocIds.map(quoteCsv).join(',')})`)
    }
    if (driveFileIds.length) {
      filters.push(`drive_file_id.in.(${driveFileIds.map(quoteCsv).join(',')})`)
    }
    const { data, error } = await client
      .from('pdf_forms')
      .select('slug, source, edirect_doc_id, drive_file_id, acroform_origin, vote_count, synced_at')
      .or(filters.join(','))
      .eq('source', 'tipizatul')
      .eq('is_active', true)
    if (error) {
      console.warn('synthesizeActionPlan candidate fetch failed:', error.message)
    } else {
      candidates = (data ?? []) as PdfFormCandidate[]
    }
  }

  return {
    procedure_id: procedure.procedureId,
    title: procedure.title,
    institution: procedure.institution ?? null,
    county: procedure.county ?? null,
    city: procedure.city ?? null,
    informational: procedure.informational,
    fields: procedure.fields ?? {},
    documents: resolveProcedureDocuments(documents, candidates),
    output_documents: procedure.outputDocuments ?? [],
    laws: procedure.laws ?? [],
  }
}

function quoteCsv(value: string): string {
  // PostgREST 'in' filter values may need quoting when they contain commas.
  // Drive ids + eDirectDocIds are URL-safe so a simple "value" wrapper works.
  return `"${value.replace(/"/g, '\\"')}"`
}
