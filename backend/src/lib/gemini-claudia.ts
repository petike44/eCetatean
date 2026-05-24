import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/generative-ai'
import { LIFE_EVENTS, OFFICES } from './knowledge-base'
import { handleToolCall } from './claudia-tools'
import type { ChatMessage, Profile } from '../types'

// Prefer lighter models first to preserve free-tier quota. Never use *-image models.
const MODEL_CANDIDATES = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
] as const

const IMAGE_MODEL_PATTERN = /-image$/i

export class GeminiQuotaError extends Error {
  constructor(message = 'Gemini API quota exceeded') {
    super(message)
    this.name = 'GeminiQuotaError'
  }
}

export function isGeminiQuotaError(err: unknown): boolean {
  if (err instanceof GeminiQuotaError) return true
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('Too Many Requests') ||
    msg.includes('RESOURCE_EXHAUSTED')
  )
}

function isRetryableGeminiError(err: unknown): boolean {
  if (isGeminiQuotaError(err)) return false
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('[404 Not Found]') ||
    msg.includes('is not found') ||
    msg.includes('not supported for generateContent')
  )
}

/** Extract text only — ignore image/binary inline parts from multimodal responses. */
function textFromChunk(chunk: { text?: () => string; candidates?: Array<{ content?: { parts?: Part[] } }> }): string {
  try {
    const direct = chunk.text?.()
    if (direct) return direct
  } catch {
    // chunk.text() throws when the response contains non-text parts (e.g. images)
  }
  const parts = chunk.candidates?.[0]?.content?.parts ?? []
  return parts
    .filter((p): p is Part & { text: string } => typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
}

function buildSystemPrompt(profile?: Partial<Profile>): string {
  const eventsSummary = Object.values(LIFE_EVENTS)
    .map(
      (e) =>
        `- ${e.event_type}: ${e.title} — ${e.summary} (${e.steps.length} pași)`
    )
    .join('\n')

  const officesSummary = Object.entries(OFFICES)
    .map(([k, o]) => `- ${k}: ${o.name}, ${o.address}`)
    .join('\n')

  const profileBlock = profile?.full_name
    ? `\nProfil cetățean: ${profile.full_name}, CNP ${profile.cnp ?? '—'}, ${profile.city ?? 'Cluj-Napoca'}.`
    : ''

  return `Ești ClaudIA, asistent civic digital pentru cetățenii din Cluj-Napoca, România.
Răspunde întotdeauna în limba română, clar și empatic.
Răspunsurile tale sunt doar text — nu genera imagini, fotografii sau fișiere vizuale.
Folosește instrumentele (funcțiile) când utilizatorul descrie un eveniment de viață, cere un formular PDF, informații despre un birou, clarificări, sau remindere.
Nu inventa proceduri — bazează-te pe baza de cunoștințe de mai jos.
Pentru mașini: diferențiază car_domestic (cumpărat în România) vs car_from_germany (import UE).
${profileBlock}

Evenimente disponibile:
${eventsSummary}

Birouri:
${officesSummary}`
}

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'handle_life_event',
    description:
      'Generează plan de acțiune pentru un eveniment civic (ex: car_from_germany, moving_to_cluj).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_type: {
          type: SchemaType.STRING,
          description: 'Cheia evenimentului din baza de cunoștințe',
        },
      },
      required: ['event_type'],
    },
  },
  {
    name: 'find_procedure',
    description:
      'Caută o procedură administrativă în catalogul tipizatul.eu (use this for any administrative procedure not in the hardcoded life-events list). Returns documents, fees, processing time, appeal routes, legal basis, and links to fillable templates when available.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Câteva cuvinte cheie din titlul procedurii',
        },
        county: {
          type: SchemaType.STRING,
          description: "Județ (default 'Cluj'). Setați la '' pentru proceduri naționale doar.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_office_info',
    description: 'Informații despre un birou public din Cluj',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        office_type: {
          type: SchemaType.STRING,
          description: 'dgep | drpciv | primarie | notar | cnas_cluj | anaf_cluj',
        },
      },
      required: ['office_type'],
    },
  },
  {
    name: 'generate_pdf',
    description: 'Pregătește descărcarea unui formular PDF pre-completat',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        form_type: {
          type: SchemaType.STRING,
          description:
            'sale_contract | transcription | impozit_auto | viza_flotant | doctor_transfer | scholarship_certificate | anaf_tva_certificate | cerere_drpciv',
        },
      },
      required: ['form_type'],
    },
  },
  {
    name: 'ask_clarification',
    description: 'Pune o întrebare cu opțiuni când intenția utilizatorului e ambiguă',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        question: { type: SchemaType.STRING },
        options: {
          type: SchemaType.STRING,
          description: 'JSON array de string-uri cu opțiuni',
        },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'set_reminder',
    description: 'Setează un reminder pentru un termen',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        deadline_days: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
      },
      required: ['title', 'deadline_days'],
    },
  },
]

function toGeminiHistory(messages: ChatMessage[]): Content[] {
  return messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }] as Part[],
  }))
}

async function streamWithModel(
  modelName: string,
  messages: ChatMessage[],
  profile: Partial<Profile> | undefined,
  enqueue: (line: object) => void
): Promise<void> {
  if (IMAGE_MODEL_PATTERN.test(modelName)) {
    throw new Error(`Image generation model blocked: ${modelName}`)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY missing')

  const lastUser = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemPrompt(profile),
    tools: [{ functionDeclarations: toolDeclarations }],
    generationConfig: {
      responseMimeType: 'text/plain',
    },
  })

  const history = toGeminiHistory(messages)
  const chat = model.startChat({ history })

  const result = await chat.sendMessageStream(lastUser)

  let fullText = ''
  for await (const chunk of result.stream) {
    const t = textFromChunk(chunk)
    if (t) {
      fullText += t
      enqueue({ type: 'text', content: t })
    }
  }

  const response = await result.response
  const calls = response.functionCalls()
  if (calls && calls.length > 0) {
    for (const call of calls) {
      const name = call.name
      const args = (call.args ?? {}) as Record<string, string>
      const stringArgs: Record<string, string> = {}
      for (const [k, v] of Object.entries(args)) {
        stringArgs[k] = typeof v === 'string' ? v : JSON.stringify(v)
      }
      const toolResult = await handleToolCall(name, stringArgs)
      enqueue({
        type: 'tool_result',
        tool_name: name,
        result: toolResult,
      })
    }
    if (!fullText.trim()) {
      enqueue({
        type: 'text',
        content: 'Am pregătit informațiile pentru tine:',
      })
    }
  }
}

export async function streamGeminiClaudia(
  messages: ChatMessage[],
  profile: Partial<Profile> | undefined,
  enqueue: (line: object) => void
): Promise<void> {
  let lastError: unknown

  for (const modelName of MODEL_CANDIDATES) {
    if (IMAGE_MODEL_PATTERN.test(modelName)) continue
    try {
      await streamWithModel(modelName, messages, profile, enqueue)
      return
    } catch (err) {
      lastError = err
      if (isGeminiQuotaError(err)) {
        throw new GeminiQuotaError()
      }
      if (isRetryableGeminiError(err)) {
        console.warn(`Gemini model ${modelName} unavailable, trying next…`, err)
        continue
      }
      throw err
    }
  }

  if (isGeminiQuotaError(lastError)) {
    throw new GeminiQuotaError()
  }
  throw lastError
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}
