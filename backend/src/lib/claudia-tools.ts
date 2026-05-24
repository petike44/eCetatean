import { findProcedure, OFFICES } from './knowledge-base'
import {
  findProcedures,
  synthesizeActionPlan,
  type SynthesizedActionPlan,
} from './tipizatul/procedure-lookup'
import { resolveProcedureActionPlanFormSlugs } from './tipizatul/action-plan-bridge'
import type { LifeEventProcedure } from '../types'

export const DEMO_LIFE_EVENT_TYPES = new Set([
  'car_from_germany',
  'car_domestic',
  'moving_to_cluj',
])

export async function handleToolCall(
  toolName: string,
  input: Record<string, string>
) {
  switch (toolName) {
    case 'handle_life_event': {
      const procedure = findProcedure(input.event_type)
      if (!procedure) {
        return {
          type: 'text_only' as const,
          message: 'Nu am informații despre acest eveniment încă.',
        }
      }
      // Phase 6: try to upgrade form_type → form_slug for any step whose
      // legacy Pipeline B form has a tipizatul-backed equivalent. The
      // hardcoded knowledge base stays the source of truth for step
      // ordering / fees / offices; we only enrich `online_action`.
      const upgraded = await resolveProcedureActionPlanFormSlugs(procedure)
      return {
        type: 'action_plan' as const,
        procedure: upgraded,
        create_life_event: DEMO_LIFE_EVENT_TYPES.has(input.event_type),
        event_type: input.event_type,
      }
    }
    case 'find_procedure': {
      const query = (input.query ?? '').trim()
      if (!query) {
        return { type: 'text_only' as const, message: 'Trebuie o cerere de căutare.' }
      }
      const county = input.county ?? 'Cluj'
      const matches = await findProcedures(query, { county, limit: 5 })
      if (matches.length === 0) {
        return {
          type: 'text_only' as const,
          message: `Nu am găsit nicio procedură pentru "${query}".`,
        }
      }
      const plan: SynthesizedActionPlan = await synthesizeActionPlan(matches[0])
      return {
        type: 'tipizatul_action_plan' as const,
        plan,
        alternatives: matches.slice(1).map((p) => ({
          procedure_id: p.procedureId,
          title: p.title,
          institution: p.institution ?? null,
          county: p.county ?? null,
        })),
      }
    }
    case 'find_office_info': {
      const office = OFFICES[input.office_type]
      if (!office) return { type: 'text_only' as const, message: 'Birou negăsit.' }
      return { type: 'office_info' as const, office, office_type: input.office_type }
    }
    case 'generate_pdf': {
      return { type: 'pdf_ready' as const, form_type: input.form_type }
    }
    case 'ask_clarification': {
      let options: string[] = []
      try {
        options = JSON.parse(input.options ?? '[]') as string[]
      } catch {
        options = []
      }
      return {
        type: 'clarification' as const,
        question: input.question,
        options,
      }
    }
    case 'set_reminder': {
      return {
        type: 'reminder_set' as const,
        title: input.title,
        deadline_days: Number(input.deadline_days),
        category: input.category,
      }
    }
    default:
      return { type: 'text_only' as const, message: '' }
  }
}

// Re-export so the synthesized action plan type appears in claudia-tools' surface.
export type { SynthesizedActionPlan, LifeEventProcedure }
