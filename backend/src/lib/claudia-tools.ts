import { findProcedure, OFFICES } from './knowledge-base'

export const DEMO_LIFE_EVENT_TYPES = new Set([
  'car_from_germany',
  'car_domestic',
  'bought_car',
  'moving_to_cluj',
])

export function handleToolCall(
  toolName: string,
  input: Record<string, string>
) {
  switch (toolName) {
    case 'handle_life_event': {
      const procedure = findProcedure(input.event_type)
      if (!procedure) {
        return {
          type: 'text_only',
          message: 'Nu am informații despre acest eveniment încă.',
        }
      }
      return {
        type: 'action_plan',
        procedure,
        create_life_event: DEMO_LIFE_EVENT_TYPES.has(input.event_type),
        event_type: input.event_type,
      }
    }
    case 'find_office_info': {
      const office = OFFICES[input.office_type]
      if (!office) return { type: 'text_only', message: 'Birou negăsit.' }
      return { type: 'office_info', office, office_type: input.office_type }
    }
    case 'generate_pdf': {
      return { type: 'pdf_ready', form_type: input.form_type }
    }
    case 'ask_clarification': {
      let options: string[] = []
      try {
        options = JSON.parse(input.options ?? '[]') as string[]
      } catch {
        options = []
      }
      return {
        type: 'clarification',
        question: input.question,
        options,
      }
    }
    case 'set_reminder': {
      return {
        type: 'reminder_set',
        title: input.title,
        deadline_days: Number(input.deadline_days),
        category: input.category,
      }
    }
    default:
      return { type: 'text_only', message: '' }
  }
}
