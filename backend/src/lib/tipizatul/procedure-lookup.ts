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

// Romanian + English stopwords stripped before ILIKE'ing the title. Users
// type whole sentences ("vreau sa construiesc o casa") but procedure titles
// are noun phrases ("Autorizație de construire"); matching on every word
// would zero-out results.
const STOPWORDS = new Set([
  // ro
  'a', 'al', 'ale', 'as', 'am', 'ai', 'are', 'avea', 'avem', 'aveti',
  'cu', 'ce', 'cum', 'cand', 'când', 'cat', 'cât', 'cei', 'cea', 'cele',
  'de', 'din', 'dar', 'daca', 'dacă', 'doar', 'doi', 'două',
  'el', 'ea', 'ele', 'ei', 'este', 'e', 'eu', 'esti', 'ești', 'eram',
  'fac', 'face', 'facem', 'fi', 'fie', 'fost',
  'imi', 'îmi', 'in', 'în', 'la', 'le', 'li', 'lor',
  'ma', 'mă', 'mi', 'mea', 'meu', 'mei', 'mele', 'mult', 'multa',
  'n', 'nu', 'ne', 'noi', 'nostru', 'noastra', 'noastră',
  'o', 'or', 'pe', 'pentru', 'prin', 'sa', 'să', 'sau', 'se', 'si', 'și',
  'sunt', 'sub', 'tot', 'toate', 'te', 'ti', 'ție', 'tu', 'un', 'una',
  'unei', 'unor', 'va', 'voi', 'vreau', 'vreți', 'vrei', 'vreti',
  'trebuie', 'cred', 'iti', 'îți',
  // en (people sometimes mix languages)
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'do', 'for', 'how', 'i', 'in',
  'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'want', 'with',
])

// Strip diacritics so "căsătorie" matches "casatorie" tokens too.
function deburr(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !STOPWORDS.has(deburr(t)))
}

/** Search the procedures table by a free-text query.
 *  Tokenizes the query, drops Romanian/English stopwords, and requires every
 *  remaining keyword to appear in the title (AND of ILIKEs). This makes
 *  full-sentence prompts like "vreau să construiesc o casă" match titles like
 *  "Autorizație de construire". Apply Cluj filter at query time by default. */
export async function findProcedures(
  query: string,
  opts: ProcedureLookupOptions = {}
): Promise<Procedure[]> {
  const client = opts.client ?? supabaseAdmin
  const county = opts.county === undefined ? 'Cluj' : opts.county
  const includeNational = opts.includeNational ?? true
  const limit = opts.limit ?? 10

  let q = client.from('procedures').select('*').limit(limit)

  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) {
    // Fall back to the raw trimmed string (preserves prior behavior for
    // pre-tokenized callers that pass a single keyword like "fiscala").
    const trimmed = query.trim()
    if (trimmed) {
      q = q.ilike('title', `%${trimmed}%`)
    }
  } else {
    // Every keyword must appear in title. ILIKE on each token rides the
    // pg_trgm gin index just like the original single-substring match did.
    for (const tok of tokens) {
      q = q.ilike('title', `%${tok}%`)
    }
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
