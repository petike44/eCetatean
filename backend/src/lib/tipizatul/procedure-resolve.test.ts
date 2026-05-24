import { describe, it, expect } from 'vitest'
import {
  extractDriveFileId,
  indexFormCandidates,
  joinKeysForDocuments,
  resolveProcedureDocuments,
  type PdfFormCandidate,
} from './procedure-resolve'
import type { ProcedureDocument } from './types'

describe('extractDriveFileId', () => {
  it('matches /file/d/<id>/...', () => {
    expect(
      extractDriveFileId('https://drive.google.com/file/d/17RMMNCijCSxdDzL7JANKIH6RQCnu1HVY/view'),
    ).toBe('17RMMNCijCSxdDzL7JANKIH6RQCnu1HVY')
  })
  it('matches /open?id=<id> and /uc?id=<id>', () => {
    expect(extractDriveFileId('https://drive.google.com/open?id=ABC123abc_-XYZ')).toBe('ABC123abc_-XYZ')
    expect(extractDriveFileId('https://drive.google.com/uc?export=download&id=ABC123abc_-XYZ')).toBe(
      'ABC123abc_-XYZ',
    )
  })
  it('returns null for missing / unrecognised URLs', () => {
    expect(extractDriveFileId('')).toBeNull()
    expect(extractDriveFileId(undefined)).toBeNull()
    expect(extractDriveFileId('https://example.com/foo.pdf')).toBeNull()
  })
})

describe('indexFormCandidates — dedupe', () => {
  it('prefers newer synced_at, then higher vote_count', () => {
    const rows: PdfFormCandidate[] = [
      { slug: 'older', source: 'tipizatul', edirect_doc_id: 'EDD1', synced_at: '2026-01-01', vote_count: 10 },
      { slug: 'newer', source: 'tipizatul', edirect_doc_id: 'EDD1', synced_at: '2026-03-01', vote_count: 1 },
      { slug: 'newest_low_vote', source: 'tipizatul', edirect_doc_id: 'EDD1', synced_at: '2026-04-01', vote_count: 0 },
    ]
    const { byEdirect } = indexFormCandidates(rows)
    expect(byEdirect.get('EDD1')?.slug).toBe('newest_low_vote')
  })
  it('breaks ties on vote_count when synced_at is equal', () => {
    const rows: PdfFormCandidate[] = [
      { slug: 'low', source: 'tipizatul', edirect_doc_id: 'X', synced_at: '2026-04-01', vote_count: 2 },
      { slug: 'high', source: 'tipizatul', edirect_doc_id: 'X', synced_at: '2026-04-01', vote_count: 99 },
    ]
    const { byEdirect } = indexFormCandidates(rows)
    expect(byEdirect.get('X')?.slug).toBe('high')
  })
})

describe('joinKeysForDocuments', () => {
  it('collects unique edirect ids + drive ids from downloadUrl', () => {
    const docs: ProcedureDocument[] = [
      { name: 'A', eDirectDocId: 'EDD1', downloadUrl: 'https://drive.google.com/file/d/1ABCDEFGHIJ_KLMNOPQ/view' },
      { name: 'B', eDirectDocId: 'EDD1', downloadUrl: 'https://drive.google.com/open?id=2STUVWXYZ_abcdefgh' },
      { name: 'C' },
    ]
    const { edirectDocIds, driveFileIds } = joinKeysForDocuments(docs)
    expect(edirectDocIds.sort()).toEqual(['EDD1'])
    expect(driveFileIds.sort()).toEqual(['1ABCDEFGHIJ_KLMNOPQ', '2STUVWXYZ_abcdefgh'])
  })
})

describe('resolveProcedureDocuments', () => {
  const candidates: PdfFormCandidate[] = [
    { slug: 'form-edd', source: 'tipizatul', edirect_doc_id: 'EDD-MATCH', synced_at: '2026-01-01' },
    { slug: 'form-drive', source: 'tipizatul', drive_file_id: 'DRIVE-MATCH', synced_at: '2026-01-01' },
  ]

  it('resolves by eDirectDocId first (primary key)', () => {
    const out = resolveProcedureDocuments(
      [{ name: 'A', eDirectDocId: 'EDD-MATCH' }],
      candidates,
    )
    expect(out[0].form_slug).toBe('form-edd')
    expect(out[0].resolution).toBe('edirect_doc_id')
  })

  it('falls back to driveFileId extracted from downloadUrl', () => {
    const out = resolveProcedureDocuments(
      [{ name: 'A', downloadUrl: 'https://drive.google.com/file/d/DRIVE-MATCH/view' }],
      candidates,
    )
    expect(out[0].form_slug).toBe('form-drive')
    expect(out[0].resolution).toBe('drive_file_id')
  })

  it('marks resolution=none when neither key matches', () => {
    const out = resolveProcedureDocuments(
      [{ name: 'A', eDirectDocId: 'GHOST', downloadUrl: 'https://example.com/x.pdf' }],
      candidates,
    )
    expect(out[0].form_slug).toBeNull()
    expect(out[0].resolution).toBe('none')
  })

  it('prefers eDirectDocId over driveFileId when both match different forms', () => {
    // Same document carries both keys; eDirectDocId is the authoritative one.
    const both: PdfFormCandidate[] = [
      { slug: 'edd-winner', source: 'tipizatul', edirect_doc_id: 'EDD', synced_at: '2026-01-01' },
      { slug: 'drive-loser', source: 'tipizatul', drive_file_id: 'DRV', synced_at: '2026-01-01' },
    ]
    const out = resolveProcedureDocuments(
      [{ name: 'A', eDirectDocId: 'EDD', downloadUrl: 'https://drive.google.com/file/d/DRV/view' }],
      both,
    )
    expect(out[0].form_slug).toBe('edd-winner')
    expect(out[0].resolution).toBe('edirect_doc_id')
  })

  it('dedupes when one upstream form was imported twice — uses the newer row', () => {
    const dupes: PdfFormCandidate[] = [
      { slug: 'older', source: 'tipizatul', edirect_doc_id: 'EDD', synced_at: '2025-12-01' },
      { slug: 'newer', source: 'tipizatul', edirect_doc_id: 'EDD', synced_at: '2026-04-01' },
    ]
    const out = resolveProcedureDocuments([{ name: 'A', eDirectDocId: 'EDD' }], dupes)
    expect(out[0].form_slug).toBe('newer')
  })
})
