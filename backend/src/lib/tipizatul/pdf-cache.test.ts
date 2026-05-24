import { describe, it, expect, vi } from 'vitest'
import { cachePathFor, getCachedTipizatulPdf } from './pdf-cache'

interface FakeStorageState {
  files: Map<string, Uint8Array>
  downloadCalls: number
  uploadCalls: number
  failUpload?: boolean
}

function makeStorage(state: FakeStorageState) {
  return {
    from(_bucket: string) {
      return {
        async download(path: string) {
          state.downloadCalls++
          const bytes = state.files.get(path)
          if (!bytes) return { data: null, error: { message: 'not found' } }
          const data = {
            arrayBuffer: async () => bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength
            ),
          }
          return { data, error: null }
        },
        async upload(path: string, bytes: Uint8Array) {
          state.uploadCalls++
          if (state.failUpload) return { data: null, error: { message: 'upload boom' } }
          state.files.set(path, new Uint8Array(bytes))
          return { data: { path }, error: null }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `mem://${path}` } }
        },
      }
    },
  } as never
}

describe('cachePathFor', () => {
  it('keys by driveFileId under tipizatul/', () => {
    expect(cachePathFor('drv-abc')).toBe('tipizatul/drv-abc.pdf')
  })
})

describe('getCachedTipizatulPdf', () => {
  it('serves from storage when the cache row exists (no Drive call)', async () => {
    const state: FakeStorageState = {
      files: new Map([['tipizatul/drv-abc.pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46])]]),
      downloadCalls: 0,
      uploadCalls: 0,
    }
    const driveFetcher = vi.fn(async () => new Uint8Array([0]))
    const out = await getCachedTipizatulPdf('drv-abc', {
      storage: makeStorage(state),
      driveFetcher,
    })
    expect(Array.from(out)).toEqual([0x25, 0x50, 0x44, 0x46])
    expect(driveFetcher).not.toHaveBeenCalled()
    expect(state.uploadCalls).toBe(0)
  })

  it('fetches from Drive on miss and writes through to storage', async () => {
    const state: FakeStorageState = {
      files: new Map(),
      downloadCalls: 0,
      uploadCalls: 0,
    }
    const driveBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
    const driveFetcher = vi.fn(async () => driveBytes)
    const out = await getCachedTipizatulPdf('drv-new', {
      storage: makeStorage(state),
      driveFetcher,
    })
    expect(out).toEqual(driveBytes)
    expect(driveFetcher).toHaveBeenCalledWith('drv-new')
    expect(state.uploadCalls).toBe(1)
    expect(state.files.has('tipizatul/drv-new.pdf')).toBe(true)
  })

  it('still returns bytes when the cache write itself fails', async () => {
    const state: FakeStorageState = {
      files: new Map(),
      downloadCalls: 0,
      uploadCalls: 0,
      failUpload: true,
    }
    const driveBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const driveFetcher = vi.fn(async () => driveBytes)
    const out = await getCachedTipizatulPdf('drv-bad-cache', {
      storage: makeStorage(state),
      driveFetcher,
    })
    expect(out).toEqual(driveBytes)
    expect(state.uploadCalls).toBe(1)
    // File was NOT actually stored (upload was reported as error) — but caller still got bytes.
    expect(state.files.has('tipizatul/drv-bad-cache.pdf')).toBe(false)
  })

  it('propagates Drive errors when the cache is empty', async () => {
    const state: FakeStorageState = { files: new Map(), downloadCalls: 0, uploadCalls: 0 }
    const driveFetcher = vi.fn(async () => {
      throw new Error('quota exceeded')
    })
    await expect(
      getCachedTipizatulPdf('drv-quota', {
        storage: makeStorage(state),
        driveFetcher,
      })
    ).rejects.toThrow(/quota exceeded/)
    expect(state.uploadCalls).toBe(0)
  })
})
