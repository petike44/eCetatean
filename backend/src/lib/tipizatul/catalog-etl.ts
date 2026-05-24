import { supabaseAdmin } from '../supabase'
import { getDoc, type FirestoreFetcher } from './firestore-client'
import { decodeCatalogIndex } from './catalog-decode'
import { templateToFormRow, type MappedTemplate } from './field-mapping'
import type { CatalogIndex, SlimTemplate, Template } from './types'

export interface SyncOptions {
  /** Optional fetcher (for tests). Defaults to live Firestore REST. */
  fetcher?: FirestoreFetcher
  /** Limit number of templates processed (smoke-test runs). */
  limit?: number
  /** Skip templates whose source_template_id already exists at this version. */
  skipUnchanged?: boolean
  /** Called for every processed template — for progress UI. */
  onProgress?: (done: number, total: number, slug: string) => void
}

export interface SyncResult {
  totalInIndex: number
  fetched: number
  upserted: number
  skipped: number
  errors: { id: string; error: string }[]
}

/** Pull the full tipizatul catalog and upsert into pdf_forms.
 *  Re-runnable + idempotent (unique index on (source, source_template_id)). */
export async function syncCatalog(opts: SyncOptions = {}): Promise<SyncResult> {
  const { fetcher, limit, skipUnchanged = true, onProgress } = opts

  const indexDoc = await getDoc<CatalogIndex & { compressed: Buffer }>(
    'catalog/index',
    fetcher
  )
  const slim = decodeCatalogIndex(indexDoc)
  const slice = typeof limit === 'number' ? slim.slice(0, limit) : slim

  const result: SyncResult = {
    totalInIndex: slim.length,
    fetched: 0,
    upserted: 0,
    skipped: 0,
    errors: [],
  }

  const existing = skipUnchanged ? await loadExistingVersions() : new Map<string, number>()

  for (let i = 0; i < slice.length; i++) {
    const s = slice[i]
    try {
      if (skipUnchanged && existing.get(s.id) === s.version) {
        result.skipped++
        onProgress?.(i + 1, slice.length, `tipizatul-${s.id}`)
        continue
      }
      const full = await getDoc<Template>(`templates/${s.id}`, fetcher)
      // The slim row carries the canonical driveFileId/version; merge in case
      // the per-template doc is missing optional fields.
      const merged: Template = { ...mergeSlimIntoTemplate(s, full) }
      const row = templateToFormRow(merged)
      result.fetched++

      await upsertForm(row)
      result.upserted++
      onProgress?.(i + 1, slice.length, row.slug)
    } catch (err) {
      result.errors.push({
        id: s.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}

function mergeSlimIntoTemplate(slim: SlimTemplate, full: Partial<Template>): Template {
  return {
    id: slim.id,
    name: full.name ?? slim.name,
    description: full.description,
    category: full.category ?? slim.category,
    organization: full.organization ?? slim.organization,
    county: full.county ?? slim.county,
    procedure: full.procedure ?? slim.procedure,
    procedureId: full.procedureId ?? slim.procedureId,
    eDirectDocId: full.eDirectDocId ?? slim.eDirectDocId,
    version: full.version ?? slim.version,
    createdAt: full.createdAt ?? new Date(0).toISOString(),
    fields: full.fields ?? [],
    archived: full.archived,
    driveFileId: full.driveFileId ?? slim.driveFileId,
    originalDriveFileId: full.originalDriveFileId,
    acroFormOrigin: full.acroFormOrigin ?? slim.acroFormOrigin,
    voteCount: full.voteCount ?? slim.voteCount,
  }
}

async function loadExistingVersions(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const { data, error } = await supabaseAdmin
    .from('pdf_forms')
    .select('source_template_id, source_version')
    .eq('source', 'tipizatul')

  if (error) {
    console.warn('Could not load existing versions; will re-upsert all:', error.message)
    return map
  }
  for (const row of (data ?? []) as { source_template_id: string | null; source_version: number | null }[]) {
    if (row.source_template_id && typeof row.source_version === 'number') {
      map.set(row.source_template_id, row.source_version)
    }
  }
  return map
}

async function upsertForm(row: MappedTemplate): Promise<void> {
  const payload = {
    slug: row.slug,
    title: row.title,
    institution: row.institution,
    description: row.description,
    category: row.category,
    tags: row.tags,
    storage_bucket: 'pdf-forms',
    // Cache key for the lazy Drive-proxy fetch (Phase 3).
    storage_path: `tipizatul/${row.drive_file_id}.pdf`,
    source_url: null,
    mapping: row.mapping,
    required_inputs: [],
    drive_file_id: row.drive_file_id,
    original_drive_file_id: row.original_drive_file_id,
    acroform_origin: row.acroform_origin,
    procedure_id: row.procedure_id,
    edirect_doc_id: row.edirect_doc_id,
    county: row.county,
    organization: row.organization,
    source: row.source,
    source_template_id: row.source_template_id,
    source_version: row.source_version,
    fields_raw: row.fields_raw,
    vote_count: row.vote_count,
    synced_at: new Date().toISOString(),
    is_active: true,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('pdf_forms')
    .upsert(payload, { onConflict: 'slug' })

  if (error) throw new Error(`upsert ${row.slug}: ${error.message}`)
}
