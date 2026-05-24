import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { writeAuditEntry } from '../lib/hash-chain'
import { handleToolCall } from '../lib/claudia-tools'
import {
  isGeminiConfigured,
  isGeminiQuotaError,
  streamGeminiClaudia,
} from '../lib/gemini-claudia'
import { findProcedure, detectEventType } from '../lib/knowledge-base'
import type { ClaudIARequest } from '../types'

export const claudiaRoute = new Hono()

function detectCarSubflow(msg: string): {
  needs_clarification: boolean
  event_type?: string
  question?: string
  options?: string[]
} {
  const lower = msg.toLowerCase()
  const hasGermany =
    lower.includes('germania') ||
    lower.includes('germani') ||
    lower.includes('germany') ||
    lower.includes('ue') ||
    lower.includes('europa') ||
    lower.includes('strainatate') ||
    lower.includes('străinătate') ||
    lower.includes('import') ||
    lower.includes('din afar')
  const hasCar =
    lower.includes('mașin') ||
    lower.includes('masin') ||
    lower.includes('masina') ||
    lower.includes('auto')
  const hasDomestic =
    lower.includes('romania') ||
    lower.includes('românia') ||
    lower.includes('intern') ||
    lower.includes('local')

  if (hasCar && hasGermany) {
    return { needs_clarification: false, event_type: 'car_from_germany' }
  }
  if (hasCar && hasDomestic) {
    return { needs_clarification: false, event_type: 'car_domestic' }
  }
  if (hasCar) {
    return {
      needs_clarification: true,
      question: 'Mașina a fost cumpărată din România sau din Germania/altă țară UE?',
      options: ['Din România', 'Din Germania/UE'],
    }
  }
  return { needs_clarification: false }
}

function getMockResponse(lastMessage: string) {
  const lower = lastMessage.toLowerCase()
  const hasCar =
    lower.includes('mașin') ||
    lower.includes('masin') ||
    lower.includes('masina') ||
    lower.includes('auto') ||
    lower.includes('cumpărat') ||
    lower.includes('cumparat') ||
    lower.includes('adus') ||
    lower.includes('aduc')

  if (hasCar) {
    const carFlow = detectCarSubflow(lastMessage)
    if (carFlow.needs_clarification) {
      return {
        text: carFlow.question!,
        tool: 'ask_clarification' as string | null,
        tool_input: {
          question: carFlow.question!,
          options: JSON.stringify(carFlow.options ?? []),
        } as Record<string, string> | null,
      }
    }
    if (carFlow.event_type) {
      const procedure = findProcedure(carFlow.event_type)
      return {
        text: procedure
          ? `Am înțeles! ${procedure.title}. Iată planul tău complet:`
          : 'Te pot ajuta cu asta. Iată ce trebuie să faci:',
        tool: 'handle_life_event' as string | null,
        tool_input: { event_type: carFlow.event_type } as Record<string, string> | null,
      }
    }
  }

  const eventType = detectEventType(lastMessage)

  if (eventType) {
    const procedure = findProcedure(eventType)
    return {
      text: procedure
        ? `Am înțeles! ${procedure.title}. Iată planul tău:`
        : 'Te pot ajuta cu asta. Iată ce trebuie să faci:',
      tool: 'handle_life_event' as string | null,
      tool_input: { event_type: eventType } as Record<string, string> | null,
    }
  }

  const msg = lastMessage.toLowerCase()

  if (msg.includes('dgep') || msg.includes('evidență')) {
    return {
      text: 'Iată informațiile despre DGEP Cluj:',
      tool: 'find_office_info',
      tool_input: { office_type: 'dgep' },
    }
  }
  if (
    msg.includes('primărie') ||
    msg.includes('primarie') ||
    msg.includes('impozit')
  ) {
    return {
      text: 'Informații despre Primăria Cluj:',
      tool: 'find_office_info',
      tool_input: { office_type: 'primarie' },
    }
  }
  if (
    msg.includes('formular') ||
    msg.includes('pdf') ||
    msg.includes('descarcă')
  ) {
    return {
      text: 'Pot genera formularul pre-completat cu datele tale:',
      tool: 'generate_pdf',
      tool_input: { form_type: 'viza_flotant' },
    }
  }

  return {
    text: 'Bună! Sunt ClaudIA, asistentul tău civic. Descrie situația ta — de exemplu "mi-am cumpărat o mașină" sau "mă mut la Cluj" — și îți ofer un plan complet cu toți pașii necesari.',
    tool: null as string | null,
    tool_input: null as Record<string, string> | null,
  }
}

claudiaRoute.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  let body: ClaudIARequest

  try {
    body = await c.req.json<ClaudIARequest>()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const { messages, profile } = body
  if (!messages || messages.length === 0) {
    return c.json({ success: false, error: 'Mesajele lipsesc' }, 400)
  }

  const lastUserMessage =
    messages.filter((m) => m.role === 'user').pop()?.content ?? ''

  writeAuditEntry({
    userId,
    action: `Sesiune ClaudIA — mesaj: "${lastUserMessage.substring(0, 60)}..."`,
    actionType: 'chat_session',
    data: { message_count: messages.length },
  })

  const encoder = new TextEncoder()
  const useGemini = isGeminiConfigured()

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (obj: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        if (useGemini) {
          await streamGeminiClaudia(messages, profile, enqueue)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 600))
          const mock = getMockResponse(lastUserMessage)
          enqueue({ type: 'text', content: mock.text })
          if (mock.tool && mock.tool_input) {
            const toolResult = await handleToolCall(
              mock.tool,
              mock.tool_input as Record<string, string>
            )
            enqueue({
              type: 'tool_result',
              tool_name: mock.tool,
              result: toolResult,
            })
          }
        }
      } catch (err) {
        console.error('ClaudIA error:', err)
        const quotaExceeded = isGeminiQuotaError(err)
        const mock = getMockResponse(lastUserMessage)
        const fallbackNote = quotaExceeded
          ? '\n\n(Limita zilnică Gemini a fost depășită. Răspuns text de rezervă — fără generare de documente sau imagini. Verifică cota pe Google AI Studio sau încearcă mai târziu.)'
          : '\n\n(Notă: răspuns de rezervă — verifică GEMINI_API_KEY și că backend-ul rulează.)'
        enqueue({
          type: 'text',
          content: mock.text + (quotaExceeded ? '' : fallbackNote),
        })
        if (mock.tool && mock.tool_input) {
          enqueue({
            type: 'tool_result',
            tool_name: mock.tool,
            result: await handleToolCall(
              mock.tool,
              mock.tool_input as Record<string, string>
            ),
          })
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
