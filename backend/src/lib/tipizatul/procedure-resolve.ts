// Resolve a Procedure's documents[*] to fillable pdf_forms rows.
//
// Join key strategy:
//   1. PRIMARY:  procedure.documents[*].eDirectDocId === pdf_forms.edirect_doc_id
//   2. FALLBACK: driveFileId extracted from documents[*].downloadUrl
//                === pdf_forms.drive_file_id
//
// Dedupe: when multiple pdf_forms rows match the same key (e.g. the same
// upstream document was imported twice as the catalog evolved), prefer
// newer rows (synced_at desc) then higher voteCount.
//
// Pure module — the DB layer bulk-fetches by id set and feeds this.

import type { ProcedureDocument } from './types'

export interface PdfFormCandidate {
  slug: string
  source: 'manual' | 'tipizatul' | string
  edirect_doc_id?: string | null
  drive_file_id?: string | null
  acroform_origin?: 'original' | 'generated' | null
  vote_count?: number | null
  synced_at?: string | null
}

export interface ResolvedDocument extends ProcedureDocument {
  /** When set, document-preview can render this form by slug. */
  form_slug: string | null
  /** Why we matched (or didn't) — useful for ClaudIA logging and UI tooltips. */
  resolution: 'edirect_doc_id' | 'drive_file_id' | 'none'
}

/** Extract a Google Drive file id from a downloadUrl, or null when the
 *  URL is not a recognised Drive sharing/preview format. */
export function extractDriveFileId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null
  // /file/d/<id>/...  or  /open?id=<id>  or  /uc?id=<id>  or  ?id=<id>
  const fileDpath = /\/file\/d\/([A-Za-z0-9_-]{10,})/.exec(url)
  if (fileDpath) return fileDpath[1]
  const idParam = /[?&]id=([A-Za-z0-9_-]{10,})/.exec(url)
  if (idParam) return idParam[1]
  return null
}

/** Build the lookup indices from a list of candidate pdf_forms rows.
 *  Dedupe rule (best-first): newer synced_at, then higher vote_count. */
export function indexFormCandidates(rows: PdfFormCandidate[]): {
  byEdirect: Map<string, PdfFormCandidate>
  byDrive: Map<string, PdfFormCandidate>
} {
  const sorted = [...rows].sort((a, b) => {
    const sa = a.synced_at ?? ''
    const sb = b.synced_at ?? ''
    if (sa !== sb) return sa < sb ? 1 : -1 // newer first
    return (b.vote_count ?? 0) - (a.vote_count ?? 0)
  })
  const byEdirect = new Map<string, PdfFormCandidate>()
  const byDrive = new Map<string, PdfFormCandidate>()
  for (const row of sorted) {
    if (row.edirect_doc_id && !byEdirect.has(row.edirect_doc_id)) {
      byEdirect.set(row.edirect_doc_id, row)
    }
    if (row.drive_file_id && !byDrive.has(row.drive_file_id)) {
      byDrive.set(row.drive_file_id, row)
    }
  }
  return { byEdirect, byDrive }
}

/** Resolve every document in a procedure against a candidate list. */
export function resolveProcedureDocuments(
  documents: ProcedureDocument[],
  candidates: PdfFormCandidate[]
): ResolvedDocument[] {
  const { byEdirect, byDrive } = indexFormCandidates(candidates)
  return documents.map((doc): ResolvedDocument => {
    if (doc.eDirectDocId) {
      const hit = byEdirect.get(doc.eDirectDocId)
      if (hit) return { ...doc, form_slug: hit.slug, resolution: 'edirect_doc_id' }
    }
    const driveId = extractDriveFileId(doc.downloadUrl)
    if (driveId) {
      const hit = byDrive.get(driveId)
      if (hit) return { ...doc, form_slug: hit.slug, resolution: 'drive_file_id' }
    }
    return { ...doc, form_slug: null, resolution: 'none' }
  })
}

/** Collect the unique join-key values we need to fetch from pdf_forms,
 *  given a procedure's documents. */
export function joinKeysForDocuments(documents: ProcedureDocument[]): {
  edirectDocIds: string[]
  driveFileIds: string[]
} {
  const edirect = new Set<string>()
  const drive = new Set<string>()
  for (const d of documents) {
    if (d.eDirectDocId) edirect.add(d.eDirectDocId)
    const id = extractDriveFileId(d.downloadUrl)
    if (id) drive.add(id)
  }
  return { edirectDocIds: [...edirect], driveFileIds: [...drive] }
}
