// Minimal anonymous Firestore REST client for the tipizatul project.
// Firestore security rules expose `templates/*` and `catalog/index` as
// public reads, so no auth header is needed.
//
// REST envelope reference:
// https://firebase.google.com/docs/firestore/reference/rest/v1/Value

const FIRESTORE_PROJECT = 'tipizatul'
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`

// ─── REST value envelope ─────────────────────────────────────────

interface FsValueMap { fields?: Record<string, FsValue> }
interface FsValueArray { values?: FsValue[] }

export type FsValue =
  | { stringValue: string }
  | { integerValue: string | number }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { bytesValue: string } // base64
  | { mapValue: FsValueMap }
  | { arrayValue: FsValueArray }
  | { referenceValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }

export interface FsDocument {
  name: string
  fields?: Record<string, FsValue>
  createTime?: string
  updateTime?: string
}

/** Strip the REST type envelope. `bytesValue` returns a Buffer; everything
 *  else collapses to its native JS shape. */
export function unwrap(value: FsValue): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('bytesValue' in value) return Buffer.from(value.bytesValue, 'base64')
  if ('referenceValue' in value) return value.referenceValue
  if ('geoPointValue' in value) return value.geoPointValue
  if ('mapValue' in value) return unwrapFields(value.mapValue.fields ?? {})
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(unwrap)
  return undefined
}

export function unwrapFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    out[key] = unwrap(value)
  }
  return out
}

/** Document ID from the full `projects/.../documents/templates/{id}` path. */
export function docIdFromName(name: string): string {
  const idx = name.lastIndexOf('/')
  return idx >= 0 ? name.slice(idx + 1) : name
}

// ─── Fetchers ────────────────────────────────────────────────────

export interface FirestoreFetcher {
  (path: string): Promise<FsDocument>
}

async function defaultFetch(path: string): Promise<FsDocument> {
  const url = `${BASE_URL}/${path}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Firestore GET ${path} failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as FsDocument
}

/** Fetch a single document and return its unwrapped fields. */
export async function getDoc<T = Record<string, unknown>>(
  path: string,
  fetcher: FirestoreFetcher = defaultFetch
): Promise<T> {
  const doc = await fetcher(path)
  return unwrapFields(doc.fields ?? {}) as T
}

/** Page through a collection. Yields unwrapped {id, ...fields} per doc. */
export async function* listCollection(
  path: string,
  fetcher: FirestoreFetcher = defaultFetch,
  pageSize = 100
): AsyncGenerator<{ id: string; data: Record<string, unknown> }> {
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ pageSize: String(pageSize) })
    if (pageToken) params.set('pageToken', pageToken)
    const url = `${BASE_URL}/${path}?${params.toString()}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      throw new Error(`Firestore LIST ${path} failed: ${res.status} ${res.statusText}`)
    }
    const body = (await res.json()) as {
      documents?: FsDocument[]
      nextPageToken?: string
    }
    for (const d of body.documents ?? []) {
      yield { id: docIdFromName(d.name), data: unwrapFields(d.fields ?? {}) }
    }
    pageToken = body.nextPageToken
  } while (pageToken)
}
