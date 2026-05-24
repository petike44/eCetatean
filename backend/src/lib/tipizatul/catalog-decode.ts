import { gunzipSync } from 'node:zlib'
import type { CatalogIndex, SlimTemplate } from './types'

export type { CatalogIndex }

export interface CatalogIndexInput {
  encoding?: CatalogIndex['encoding'] | string
  compressed: Buffer | Uint8Array | string
  generatedAt?: string | number
}

/** Decompress the `catalog/index` document into a SlimTemplate[].
 *  Accepts either the REST-unwrapped shape (bytesValue → Buffer) or a
 *  hand-built object where `compressed` is base64 / Buffer. */
export function decodeCatalogIndex(index: CatalogIndexInput): SlimTemplate[] {
  if (index.encoding && index.encoding !== 'gzip+json') {
    throw new Error(`Unsupported catalog encoding: ${index.encoding}`)
  }

  const buf = toBuffer(index.compressed)
  const json = gunzipSync(buf).toString('utf8')
  const parsed: unknown = JSON.parse(json)

  if (!Array.isArray(parsed)) {
    throw new Error('Catalog index payload is not an array of SlimTemplate')
  }
  return parsed as SlimTemplate[]
}

function toBuffer(input: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(input)) return input
  if (input instanceof Uint8Array) return Buffer.from(input)
  if (typeof input === 'string') return Buffer.from(input, 'base64')
  throw new Error('catalog.compressed must be Buffer, Uint8Array, or base64 string')
}
