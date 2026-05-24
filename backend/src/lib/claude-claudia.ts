import Anthropic from '@anthropic-ai/sdk'
import { LIFE_EVENTS, OFFICES } from './knowledge-base'
import { handleToolCall } from './claudia-tools'
import type { ChatMessage, Profile } from '../types'

const MODEL = 'claude-sonnet-4-6'

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

REGULI CRITICE:
- Răspunde ÎNTOTDEAUNA în limba română.
- Fii SCURT și DIRECT. Maxim 2-3 propoziții per răspuns, dacă nu e nevoie de mai mult.
- NU folosi formatare markdown: fără **, fără *, fără #, fără liste cu liniuță. Scrie text simplu.
- NU te prezenta și nu enumera ce poți face. Răspunde direct la ce a spus utilizatorul.
- Pentru ORICE întrebare administrativă, folosește un instrument — nu da răspunsuri text simple.
- Dacă nu înțelegi, pune O singură întrebare scurtă.
- Pentru mașini: diferențiază car_domestic (cumpărat în România) vs car_from_germany (import UE).
${profileBlock}

CUM SĂ ALEGI INSTRUMENTUL:
1. Dacă cererea se potrivește cu un eveniment din lista de mai jos, folosește handle_life_event cu event_type-ul potrivit.
2. Altfel folosește find_procedure pentru a căuta în catalogul național de proceduri (3000+ proceduri).

CUM SĂ FORMULEZI QUERY-UL PENTRU find_procedure:
- Folosește 1-3 cuvinte cheie din titlul procedurii, NU propoziții întregi.
- Elimină verbe ("vreau", "trebuie", "să fac") și pronume ("eu", "îmi").
- Folosește substantive administrative concrete: "autorizație construire", "căsătorie", "transcriere act", "certificat fiscal", "buletin".
- Exemple bune: "vreau să construiesc o casă" → query="autorizație construire". "cum mă căsătoresc" → query="căsătorie". "schimb buletinul" → query="carte identitate".

DACĂ find_procedure RETURNEAZĂ text_only ("nu am găsit nicio procedură"):
- Retry IMEDIAT cu cuvinte cheie mai scurte sau sinonime (max 2 reîncercări).
- Exemplu: dacă "autorizație construire casa" eșuează, încearcă "autorizație construire", apoi "construire".
- Doar dacă toate eșuează, oferă un răspuns scurt din cunoștințele tale generale despre procedura respectivă și menționează că nu e în catalog.

Evenimente disponibile:
${eventsSummary}

Birouri:
${officesSummary}`
}

const tools: Anthropic.Tool[] = [
  {
    name: 'handle_life_event',
    description:
      'Generează plan de acțiune pentru un eveniment civic (ex: car_from_germany, moving_to_cluj).',
    input_schema: {
      type: 'object',
      properties: {
        event_type: {
          type: 'string',
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
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Câteva cuvinte cheie din titlul procedurii',
        },
        county: {
          type: 'string',
          description: "Județ (default 'Cluj'). Setați la '' pentru proceduri naționale doar.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_office_info',
    description: 'Informații despre un birou public din Cluj',
    input_schema: {
      type: 'object',
      properties: {
        office_type: {
          type: 'string',
          description: 'dgep | drpciv | primarie | notar | cnas_cluj | anaf_cluj',
        },
      },
      required: ['office_type'],
    },
  },
  {
    name: 'generate_pdf',
    description: 'Pregătește descărcarea unui formular PDF pre-completat',
    input_schema: {
      type: 'object',
      properties: {
        form_type: {
          type: 'string',
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
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: {
          type: 'string',
          description: 'JSON array de string-uri cu opțiuni',
        },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'set_reminder',
    description: 'Setează un reminder pentru un termen',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        deadline_days: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['title', 'deadline_days'],
    },
  },
]

function toAnthropicHistory(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }))
}

export async function streamClaudeClaudia(
  messages: ChatMessage[],
  profile: Partial<Profile> | undefined,
  enqueue: (line: object) => void
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDIA_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY (or CLAUDIA_API_KEY) missing')

  const client = new Anthropic({ apiKey })
  const lastUser = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
  const history = toAnthropicHistory(messages)

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(profile),
    tools,
    messages: [
      ...history,
      { role: 'user', content: lastUser },
    ],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta' &&
      event.delta.text
    ) {
      enqueue({ type: 'text', content: event.delta.text })
    }
  }

  const finalMessage = await stream.finalMessage()

  const hasText = finalMessage.content.some(
    (b) => b.type === 'text' && b.text.trim().length > 0
  )

  const toolUseBlocks = finalMessage.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )

  for (const block of toolUseBlocks) {
    const args: Record<string, string> = {}
    for (const [k, v] of Object.entries(block.input as Record<string, unknown>)) {
      args[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }
    const toolResult = await handleToolCall(block.name, args)
    enqueue({ type: 'tool_result', tool_name: block.name, result: toolResult })
  }

  if (!hasText && toolUseBlocks.length > 0) {
    enqueue({ type: 'text', content: 'Am pregătit informațiile pentru tine:' })
  }
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDIA_API_KEY?.trim())
}
