// Lazy cache of tipizatul Drive PDFs into the existing Supabase
// `pdf-forms` bucket. On miss we hit the Drive proxy, then upload so
// subsequent requests serve from storage.

import { supabaseAdmin } from '../supabase'
import { fetchDrivePdf, sharedTokenCache, type DriveProxyOptions } from './drive-proxy'

const BUCKET = 'pdf-forms'

export function cachePathFor(driveFileId: string): string {
  return `tipizatul/${driveFileId}.pdf`
}

export interface PdfCacheDeps {
  /** Storage client (defaults to supabaseAdmin.storage). Injected for tests. */
  storage?: typeof supabaseAdmin.storage
  /** Drive fetcher override (defaults to live fetchDrivePdf). For tests. */
  driveFetcher?: (driveFileId: string) => Promise<Uint8Array>
  /** Drive proxy options forwarded when using the live fetcher. */
  driveOptions?: DriveProxyOptions
}

/** Get bytes for a tipizatul-sourced PDF, populating the cache on miss. */
export async function getCachedTipizatulPdf(
  driveFileId: string,
  deps: PdfCacheDeps = {}
): Promise<Uint8Array> {
  const storage = deps.storage ?? supabaseAdmin.storage
  const path = cachePathFor(driveFileId)

  // Cache hit
  const cached = await readFromStorage(storage, path)
  if (cached) return cached

  // Miss → fetch from Drive
  const fetcher = deps.driveFetcher
    ?? ((id: string) => fetchDrivePdf(id, {
      tokenCache: sharedTokenCache,
      ...deps.driveOptions,
    }))
  const bytes = await fetcher(driveFileId)

  // Best-effort write to storage. If upload fails (RLS, quota), still
  // return the bytes — the caller's request shouldn't 500 because the
  // cache write is broken.
  try {
    await storage.from(BUCKET).upload(path, bytes, {
      contentType: 'application/pdf',
      upsert: true,
    })
  } catch (err) {
    console.warn(`tipizatul cache upload failed for ${path}:`, err)
  }

  return bytes
}

async function readFromStorage(
  storage: typeof supabaseAdmin.storage,
  path: string
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await storage.from(BUCKET).download(path)
    if (data && !error) {
      return new Uint8Array(await data.arrayBuffer())
    }
  } catch {
    // fall through
  }
  return null
}
