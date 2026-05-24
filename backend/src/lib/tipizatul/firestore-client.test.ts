import { describe, it, expect } from 'vitest'
import { unwrap, unwrapFields, docIdFromName, type FsValue } from './firestore-client'

describe('Firestore REST value unwrappers', () => {
  it('unwraps stringValue, integerValue, booleanValue, nullValue', () => {
    expect(unwrap({ stringValue: 'hi' } as FsValue)).toBe('hi')
    expect(unwrap({ integerValue: '42' } as FsValue)).toBe(42)
    expect(unwrap({ booleanValue: true } as FsValue)).toBe(true)
    expect(unwrap({ nullValue: null } as FsValue)).toBeNull()
  })

  it('decodes bytesValue (base64) to a Buffer', () => {
    const out = unwrap({ bytesValue: Buffer.from('hello').toString('base64') } as FsValue)
    expect(Buffer.isBuffer(out)).toBe(true)
    expect((out as Buffer).toString('utf8')).toBe('hello')
  })

  it('recursively unwraps mapValue and arrayValue', () => {
    const fields = unwrapFields({
      name: { stringValue: 'Cerere' },
      version: { integerValue: '3' },
      county: { nullValue: null },
      tags: {
        arrayValue: {
          values: [{ stringValue: 'a' }, { stringValue: 'b' }],
        },
      },
      meta: {
        mapValue: {
          fields: {
            archived: { booleanValue: false },
            n: { doubleValue: 1.5 },
          },
        },
      },
    })
    expect(fields).toEqual({
      name: 'Cerere',
      version: 3,
      county: null,
      tags: ['a', 'b'],
      meta: { archived: false, n: 1.5 },
    })
  })

  it('docIdFromName returns the last path segment', () => {
    expect(
      docIdFromName(
        'projects/tipizatul/databases/(default)/documents/templates/abc-123'
      )
    ).toBe('abc-123')
    expect(docIdFromName('flat-id')).toBe('flat-id')
  })
})
