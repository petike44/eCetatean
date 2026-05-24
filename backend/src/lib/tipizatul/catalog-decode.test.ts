import { describe, it, expect } from 'vitest'
import { gzipSync } from 'node:zlib'
import { decodeCatalogIndex } from './catalog-decode'
import type { SlimTemplate } from './types'

function fixture(): SlimTemplate[] {
  return [
    {
      id: 'tpl-a',
      name: 'Cerere A',
      category: 'evidenta',
      organization: 'DGEP Cluj',
      county: 'Cluj',
      driveFileId: 'drv-aaa',
      acroFormOrigin: 'original',
      version: 3,
    },
    {
      id: 'tpl-b',
      name: 'Cerere B',
      driveFileId: 'drv-bbb',
      acroFormOrigin: 'generated',
      version: 1,
    },
  ]
}

describe('decodeCatalogIndex', () => {
  it('round-trips a gzipped JSON Buffer', () => {
    const compressed = gzipSync(Buffer.from(JSON.stringify(fixture()), 'utf8'))
    const out = decodeCatalogIndex({ encoding: 'gzip+json', compressed })
    expect(out).toHaveLength(2)
    expect(out[0].id).toBe('tpl-a')
    expect(out[0].county).toBe('Cluj')
    expect(out[1].acroFormOrigin).toBe('generated')
  })

  it('accepts base64 string compressed payloads', () => {
    const compressed = gzipSync(Buffer.from(JSON.stringify(fixture()), 'utf8'))
    const out = decodeCatalogIndex({
      encoding: 'gzip+json',
      compressed: compressed.toString('base64'),
    })
    expect(out).toHaveLength(2)
  })

  it('rejects unknown encodings', () => {
    expect(() =>
      decodeCatalogIndex({
        encoding: 'br+json',
        compressed: Buffer.from(''),
      })
    ).toThrow(/Unsupported catalog encoding/)
  })

  it('rejects non-array payloads', () => {
    const compressed = gzipSync(Buffer.from(JSON.stringify({ not: 'array' }), 'utf8'))
    expect(() => decodeCatalogIndex({ encoding: 'gzip+json', compressed })).toThrow(
      /not an array/
    )
  })
})
