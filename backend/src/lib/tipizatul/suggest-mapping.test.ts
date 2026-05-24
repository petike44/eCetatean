import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  constrainDataKey,
  suggestMapping,
  KNOWN_PROFILE_KEYS,
} from './suggest-mapping'
import type { TemplateField } from './types'

function fields(): TemplateField[] {
  return [
    { pdfFieldName: 'Nume', type: 'text', label: 'Nume si prenume', isRequired: true },
    { pdfFieldName: 'CNP', type: 'text', label: 'Cod numeric personal', isRequired: true },
    { pdfFieldName: 'sex', type: 'radio', label: 'Sex', isRequired: true, options: ['M', 'F'] },
    { pdfFieldName: 'sig1', type: 'unsupported', label: 'Semnatura', isRequired: false },
    { pdfFieldName: 'hidden_flag', type: 'text', label: 'Internal', isRequired: false, hidden: true },
    { pdfFieldName: 'data', type: 'text', label: 'Data', isRequired: true },
  ]
}

describe('constrainDataKey', () => {
  it('passes known profile.* keys through verbatim', () => {
    expect(constrainDataKey('profile.full_name', 'x')).toBe('profile.full_name')
    expect(constrainDataKey('profile.cnp', 'x')).toBe('profile.cnp')
  })
  it('passes system.today through', () => {
    expect(constrainDataKey('system.today', 'x')).toBe('system.today')
  })
  it('passes well-formed input.* keys through', () => {
    expect(constrainDataKey('input.vehicle_make', 'x')).toBe('input.vehicle_make')
  })
  it('coerces unknown profile.* keys to input.<fallback>', () => {
    // Never invent a profile.* key the Profile type doesn't know about.
    expect(constrainDataKey('profile.imaginary_field', 'orig_id')).toBe('input.orig_id')
  })
  it('coerces empty / garbage / non-string inputs to input.<fallback>', () => {
    expect(constrainDataKey('', 'orig_id')).toBe('input.orig_id')
    expect(constrainDataKey('blarg', 'orig_id')).toBe('input.orig_id')
    expect(constrainDataKey('input. spaces bad', 'orig_id')).toBe('input.orig_id')
  })
})

describe('suggestMapping — heuristic fallback (no Gemini)', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY
  })

  it('returns heuristic mapping when GEMINI_API_KEY is missing', async () => {
    const result = await suggestMapping(fields())
    expect(result.fallback).toBe(true)
    // unsupported + hidden are filtered out before the mapping
    expect(result.mapping).toHaveLength(4)
    expect(result.mapping.map((f) => f.acroFieldName)).toEqual(['Nume', 'CNP', 'sex', 'data'])
    // Default heuristic: input.<safeId>, source 'heuristic'.
    expect(result.mapping[0].dataKey).toMatch(/^input\./)
    expect(result.mapping[0].source).toBe('heuristic')
  })

  it('returns empty mapping when there are no fillable fields', async () => {
    const onlyUnsupported: TemplateField[] = [
      { pdfFieldName: 's', type: 'unsupported', label: 'sig', isRequired: false },
    ]
    const result = await suggestMapping(onlyUnsupported)
    expect(result.mapping).toEqual([])
    expect(result.fallback).toBe(false)
  })
})

describe('suggestMapping — mocked Gemini happy path', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'fake-key-for-test'
  })
  afterEach(() => {
    delete process.env.GEMINI_API_KEY
  })

  it('returns the model proposals with source=ai when they pass the constraint', async () => {
    const generateContent = vi.fn(async () =>
      JSON.stringify({
        proposals: [
          { pdfFieldName: 'Nume', dataKey: 'profile.full_name', confidence: 0.95 },
          { pdfFieldName: 'CNP', dataKey: 'profile.cnp', confidence: 0.9 },
          { pdfFieldName: 'sex', dataKey: 'input.sex', confidence: 0.6 },
          { pdfFieldName: 'data', dataKey: 'system.today', confidence: 0.85 },
        ],
      }),
    )
    const result = await suggestMapping(fields(), { generateContent })
    expect(result.fallback).toBe(false)
    expect(generateContent).toHaveBeenCalledOnce()
    const byField = Object.fromEntries(result.mapping.map((f) => [f.acroFieldName, f]))
    expect(byField['Nume'].dataKey).toBe('profile.full_name')
    expect(byField['Nume'].source).toBe('ai')
    expect(byField['Nume'].confidence).toBeCloseTo(0.95)
    expect(byField['CNP'].dataKey).toBe('profile.cnp')
    expect(byField['sex'].dataKey).toBe('input.sex')
    expect(byField['data'].dataKey).toBe('system.today')
  })

  it('handles a code-fenced JSON response (model wraps with ```json)', async () => {
    const generateContent = vi.fn(async () =>
      '```json\n' + JSON.stringify({
        proposals: [{ pdfFieldName: 'Nume', dataKey: 'profile.full_name', confidence: 0.9 }],
      }) + '\n```',
    )
    const result = await suggestMapping(fields(), { generateContent })
    expect(result.mapping.find((f) => f.acroFieldName === 'Nume')?.dataKey).toBe(
      'profile.full_name',
    )
  })

  it('constrains hallucinated profile.* keys back to input.<safeId>', async () => {
    const generateContent = vi.fn(async () =>
      JSON.stringify({
        proposals: [
          // Model invents a key not in the Profile type.
          { pdfFieldName: 'Nume', dataKey: 'profile.cetateanul', confidence: 0.99 },
        ],
      }),
    )
    const result = await suggestMapping(fields(), { generateContent })
    const numeProposal = result.mapping.find((f) => f.acroFieldName === 'Nume')!
    expect(numeProposal.dataKey).toMatch(/^input\./)
    expect((KNOWN_PROFILE_KEYS as readonly string[]).includes(numeProposal.dataKey)).toBe(false)
    // confidence still preserved; the UI should de-emphasise constrained ones in review
    expect(numeProposal.source).toBe('ai')
  })

  it('falls back to heuristic when the model throws', async () => {
    const generateContent = vi.fn(async () => {
      throw new Error('upstream 500')
    })
    const result = await suggestMapping(fields(), { generateContent })
    expect(result.fallback).toBe(true)
    expect(result.mapping.every((f) => f.source === 'heuristic')).toBe(true)
  })

  it('drops proposals for unknown pdfFieldNames (defensive)', async () => {
    const generateContent = vi.fn(async () =>
      JSON.stringify({
        proposals: [
          { pdfFieldName: 'GHOST', dataKey: 'profile.full_name', confidence: 0.9 },
          { pdfFieldName: 'Nume', dataKey: 'profile.full_name', confidence: 0.9 },
        ],
      }),
    )
    const result = await suggestMapping(fields(), { generateContent })
    expect(result.mapping.find((f) => f.acroFieldName === 'Nume')?.dataKey).toBe(
      'profile.full_name',
    )
    // Nothing in the output should reference 'GHOST'.
    expect(result.mapping.find((f) => f.acroFieldName === 'GHOST')).toBeUndefined()
  })

  it('clamps confidence to [0,1]', async () => {
    const generateContent = vi.fn(async () =>
      JSON.stringify({
        proposals: [
          { pdfFieldName: 'Nume', dataKey: 'profile.full_name', confidence: 5 },
          { pdfFieldName: 'CNP', dataKey: 'profile.cnp', confidence: -3 },
        ],
      }),
    )
    const result = await suggestMapping(fields(), { generateContent })
    const nume = result.mapping.find((f) => f.acroFieldName === 'Nume')!
    const cnp = result.mapping.find((f) => f.acroFieldName === 'CNP')!
    expect(nume.confidence).toBe(1)
    expect(cnp.confidence).toBe(0)
  })

  it('respects forceFallback even when GEMINI_API_KEY is set', async () => {
    const generateContent = vi.fn()
    const result = await suggestMapping(fields(), {
      forceFallback: true,
      generateContent,
    })
    expect(result.fallback).toBe(true)
    expect(generateContent).not.toHaveBeenCalled()
  })
})
