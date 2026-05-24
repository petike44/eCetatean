// AI-assisted mapping suggestion.
//
// Given a tipizatul Template's fields_raw + the Profile shape, ask Gemini
// to propose a dataKey ('profile.<known>' | 'input.<safe-id>' | 'system.today')
// for each fillable field. The output is constrained to known keys + a
// strict JSON schema; anything outside the vocabulary is coerced to
// 'input.<safeId(pdfFieldName)>' so we never invent profile.* keys.
//
// Returns PdfAutofillField[] tagged with source='ai' + a per-field confidence.
// Does NOT persist; the existing PUT /:id/mapping is the confirm step.

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { isGeminiConfigured } from '../gemini-claudia'
import { templateFieldToAutofill, isFillable } from './field-mapping'
import type { TemplateField } from './types'
import type { PdfAutofillField } from '../../types'

const MODEL_CANDIDATES = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
] as const

/** Known profile.* keys. Mirrors the Profile interface in types/index.ts.
 *  Plus two derived addressing schemes that resolveDataKey already understands. */
export const KNOWN_PROFILE_KEYS = [
  'profile.full_name',
  'profile.cnp',
  'profile.date_of_birth',
  'profile.buletin_series',
  'profile.buletin_number',
  'profile.buletin_expiry',
  'profile.address',
  'profile.city',
  'profile.phone',
  'profile.email',
  // composed in resolveDataKey:
  'profile.full_address',     // address + city
  'profile.identity_card',    // buletin_series + buletin_number
] as const
export type KnownProfileKey = (typeof KNOWN_PROFILE_KEYS)[number]
export const SYSTEM_TODAY = 'system.today'

export interface ProposedField {
  pdfFieldName: string
  dataKey: string
  confidence: number
  reason?: string
}

export interface SuggestMappingDeps {
  /** Inject a Gemini client (tests). */
  generateContent?: (params: {
    model: string
    systemInstruction: string
    userPrompt: string
  }) => Promise<string>
  /** Force-disable Gemini even if env is present (tests). */
  forceFallback?: boolean
}

export interface SuggestMappingResult {
  mapping: PdfAutofillField[]
  /** True when we returned the heuristic default (no Gemini key, or model failed). */
  fallback: boolean
}

/** Build heuristic mapping (Phase 1 default: input.<safeId>, source='heuristic'). */
function heuristicMapping(fields: TemplateField[]): PdfAutofillField[] {
  return fields
    .filter(isFillable)
    .map((f, i) => ({ ...templateFieldToAutofill(f, i), source: 'heuristic' as const }))
}

/** Main entry. Constrains output to the known dataKey vocabulary. */
export async function suggestMapping(
  fieldsRaw: TemplateField[],
  deps: SuggestMappingDeps = {}
): Promise<SuggestMappingResult> {
  const fillable = fieldsRaw.filter(isFillable)
  if (fillable.length === 0) return { mapping: [], fallback: false }

  const fallback = deps.forceFallback || !isGeminiConfigured()
  if (fallback && !deps.generateContent) {
    return { mapping: heuristicMapping(fieldsRaw), fallback: true }
  }

  const generateContent = deps.generateContent ?? defaultGenerateContent
  let proposals: ProposedField[]
  try {
    proposals = await callModelWithFallback(fillable, generateContent)
  } catch (err) {
    console.warn('suggest-mapping AI call failed, returning heuristic:', err)
    return { mapping: heuristicMapping(fieldsRaw), fallback: true }
  }

  const proposalIndex = new Map(proposals.map((p) => [p.pdfFieldName, p]))
  const mapping = fillable.map((field, i): PdfAutofillField => {
    const base = templateFieldToAutofill(field, i)
    const proposal = proposalIndex.get(field.pdfFieldName)
    if (!proposal) return { ...base, source: 'heuristic' }
    const dataKey = constrainDataKey(proposal.dataKey, base.id)
    return {
      ...base,
      dataKey,
      confidence: clampConfidence(proposal.confidence),
      source: 'ai' as PdfAutofillField['source'],
    }
  })
  return { mapping, fallback: false }
}

/** Coerce any model-proposed dataKey into the known vocabulary.
 *  Anything we don't recognise becomes 'input.<safeId(pdfFieldName)>' so we
 *  never invent a profile.* key. */
export function constrainDataKey(proposed: string, fallbackId: string): string {
  const candidate = String(proposed ?? '').trim()
  if (candidate === SYSTEM_TODAY) return SYSTEM_TODAY
  if ((KNOWN_PROFILE_KEYS as readonly string[]).includes(candidate)) return candidate
  if (/^input\.[a-z0-9_]+$/i.test(candidate)) return candidate
  return `input.${fallbackId}`
}

function clampConfidence(n: unknown): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0.5
  return Math.max(0, Math.min(1, x))
}

// ─── Gemini call (with model fallback) ───────────────────────────

async function callModelWithFallback(
  fillable: TemplateField[],
  generateContent: NonNullable<SuggestMappingDeps['generateContent']>
): Promise<ProposedField[]> {
  const systemInstruction = SUGGEST_SYSTEM_PROMPT
  const userPrompt = buildUserPrompt(fillable)
  let lastError: unknown
  for (const model of MODEL_CANDIDATES) {
    try {
      const raw = await generateContent({ model, systemInstruction, userPrompt })
      return parseProposalJson(raw)
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('[404 Not Found]') || msg.includes('not supported for generateContent')) {
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error('all suggest-mapping model candidates failed')
}

const SUGGEST_SYSTEM_PROMPT = `You map PDF AcroForm fields from Romanian government forms to citizen profile keys.

For each input field you receive { pdfFieldName, label, hint, type, options }, propose ONE of:
  - a profile key from this exact list: ${KNOWN_PROFILE_KEYS.join(', ')}
  - 'system.today' if the field clearly asks for today's date
  - 'input.<short_snake_case>' if the user must supply the value at fill time

Hard rules:
  - NEVER invent a profile.* key outside the list above.
  - When uncertain, return 'input.<short_snake_case>' with low confidence.
  - Output JSON only — an object with a top-level "proposals" array of
    { pdfFieldName, dataKey, confidence (0..1), reason } items.`

function buildUserPrompt(fillable: TemplateField[]): string {
  const compact = fillable.map((f) => ({
    pdfFieldName: f.pdfFieldName,
    label: f.label,
    hint: f.hint,
    type: f.type,
    options: f.options,
  }))
  return `Fields:\n${JSON.stringify(compact, null, 2)}`
}

function parseProposalJson(raw: string): ProposedField[] {
  const trimmed = stripCodeFence(raw)
  const parsed: unknown = JSON.parse(trimmed)
  if (!parsed || typeof parsed !== 'object') return []
  const proposals = (parsed as { proposals?: unknown }).proposals
  if (!Array.isArray(proposals)) return []
  return proposals
    .map((p): ProposedField | null => {
      if (!p || typeof p !== 'object') return null
      const v = p as Partial<ProposedField>
      if (typeof v.pdfFieldName !== 'string' || typeof v.dataKey !== 'string') return null
      return {
        pdfFieldName: v.pdfFieldName,
        dataKey: v.dataKey,
        confidence: typeof v.confidence === 'number' ? v.confidence : 0.5,
        reason: typeof v.reason === 'string' ? v.reason : undefined,
      }
    })
    .filter((p): p is ProposedField => Boolean(p))
}

function stripCodeFence(s: string): string {
  const trimmed = s.trim()
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim()
  }
  return trimmed
}

async function defaultGenerateContent(params: {
  model: string
  systemInstruction: string
  userPrompt: string
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY missing')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    systemInstruction: params.systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          proposals: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                pdfFieldName: { type: SchemaType.STRING },
                dataKey: { type: SchemaType.STRING },
                confidence: { type: SchemaType.NUMBER },
                reason: { type: SchemaType.STRING },
              },
              required: ['pdfFieldName', 'dataKey', 'confidence'],
            },
          },
        },
        required: ['proposals'],
      },
    },
  })
  const result = await model.generateContent(params.userPrompt)
  return result.response.text()
}
