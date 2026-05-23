import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { writeAuditEntry } from '../lib/hash-chain'
import { findProcedure } from '../lib/knowledge-base'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import type {
  StepStatus,
  LifeEventProgress,
  LifeEventProgressWithDetails,
} from '../types'

export const lifeEventsRoute = new Hono()

const mockLifeEventStore = new Map<string, LifeEventProgress>()

function buildStepStatuses(totalSteps: number): Record<string, StepStatus> {
  const statuses: Record<string, StepStatus> = {}
  for (let i = 1; i <= totalSteps; i++) {
    statuses[`step_${i}`] = 'pending'
  }
  return statuses
}

function calcCompletionPercentage(
  stepsStatus: Record<string, StepStatus>,
  totalSteps: number
): number {
  const completed = Object.values(stepsStatus).filter(
    (s) => s === 'completed'
  ).length
  return totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0
}

function estimateTotalCost(steps: { fee: string }[]): string {
  let total = 0
  for (const step of steps) {
    const matches = step.fee.match(/\d[\d.]+/g)
    if (matches) {
      const nums = matches.map((m) => parseFloat(m.replace('.', '')))
      total += Math.min(...nums)
    }
  }
  return total > 0 ? `~${total.toLocaleString('ro-RO')} RON` : 'Variabil'
}

function enrichWithDetails(
  event: LifeEventProgress
): LifeEventProgressWithDetails {
  const procedure = findProcedure(event.event_type)
  const step_details = procedure?.steps ?? []
  return {
    ...event,
    step_details,
    completion_percentage: calcCompletionPercentage(
      event.steps_status,
      event.total_steps
    ),
    estimated_total_cost: estimateTotalCost(step_details),
  }
}

// POST /api/life-events — create a new life event tracker
lifeEventsRoute.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  let body: { event_type: string; event_data?: Record<string, unknown> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const { event_type, event_data = {} } = body
  if (!event_type) {
    return c.json({ success: false, error: 'event_type este obligatoriu' }, 400)
  }

  const procedure = findProcedure(event_type)
  if (!procedure) {
    return c.json(
      { success: false, error: `Eveniment necunoscut: ${event_type}` },
      400
    )
  }

  const totalSteps = procedure.steps.length
  const stepsStatus = buildStepStatuses(totalSteps)

  if (!isSupabaseConfigured) {
    const mock: LifeEventProgress = {
      id: `mock-${Date.now()}`,
      user_id: userId,
      event_type,
      event_title: procedure.title,
      event_data,
      steps_status: stepsStatus,
      current_step: 1,
      total_steps: totalSteps,
      is_completed: false,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    }
    mockLifeEventStore.set(mock.id, mock)
    return c.json({ success: true, data: enrichWithDetails(mock) })
  }

  const { data, error } = await supabaseAdmin
    .from('life_event_progress')
    .insert({
      user_id: userId,
      event_type,
      event_title: procedure.title,
      event_data,
      steps_status: stepsStatus,
      current_step: 1,
      total_steps: totalSteps,
    })
    .select()
    .single()

  if (error) {
    console.error('life_event_progress insert error:', error.message)
    return c.json({ success: false, error: 'Eroare la crearea evenimentului' }, 500)
  }

  writeAuditEntry({
    userId,
    action: `Eveniment civic pornit: ${procedure.title}`,
    actionType: 'life_event_started',
    data: { event_type, event_id: data.id },
  })

  return c.json({ success: true, data: enrichWithDetails(data as LifeEventProgress) })
})

// GET /api/life-events — list all for user
lifeEventsRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  if (!isSupabaseConfigured) {
    const mocks = [...mockLifeEventStore.values()]
      .filter((e) => e.user_id === userId)
      .map(enrichWithDetails)
    return c.json({ success: true, data: mocks })
  }

  const { data, error } = await supabaseAdmin
    .from('life_event_progress')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (error) {
    return c.json({ success: false, error: 'Eroare la citirea evenimentelor' }, 500)
  }

  const enriched = (data as LifeEventProgress[]).map(enrichWithDetails)
  return c.json({ success: true, data: enriched })
})

// GET /api/life-events/:id — single event
lifeEventsRoute.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  if (!isSupabaseConfigured) {
    const mock = mockLifeEventStore.get(id)
    if (!mock || mock.user_id !== userId) {
      return c.json({ success: false, error: 'Eveniment negăsit' }, 404)
    }
    return c.json({ success: true, data: enrichWithDetails(mock) })
  }

  const { data, error } = await supabaseAdmin
    .from('life_event_progress')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return c.json({ success: false, error: 'Eveniment negăsit' }, 404)
  }

  return c.json({ success: true, data: enrichWithDetails(data as LifeEventProgress) })
})

// PATCH /api/life-events/:id/steps/:stepNumber — update step status
lifeEventsRoute.patch('/:id/steps/:stepNumber', requireAuth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const stepNumber = parseInt(c.req.param('stepNumber'), 10)

  let body: { status: StepStatus }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Request body invalid' }, 400)
  }

  const { status } = body
  const validStatuses: StepStatus[] = ['pending', 'in_progress', 'completed', 'skipped']
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Status invalid' }, 400)
  }

  if (!isSupabaseConfigured) {
    const mock = mockLifeEventStore.get(id)
    if (!mock || mock.user_id !== userId) {
      return c.json({ success: false, error: 'Eveniment negăsit' }, 404)
    }
    const stepKey = `step_${stepNumber}`
    const updatedStepsStatus = { ...mock.steps_status, [stepKey]: status }
    const updated: LifeEventProgress = {
      ...mock,
      steps_status: updatedStepsStatus,
      updated_at: new Date().toISOString(),
    }
    mockLifeEventStore.set(id, updated)
    return c.json({ success: true, data: enrichWithDetails(updated) })
  }

  // Fetch current record
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('life_event_progress')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !existing) {
    return c.json({ success: false, error: 'Eveniment negăsit' }, 404)
  }

  const record = existing as LifeEventProgress
  const stepKey = `step_${stepNumber}`
  const updatedStepsStatus = { ...record.steps_status, [stepKey]: status }

  // Advance current_step if this step was completed
  let nextCurrentStep = record.current_step
  if (status === 'completed' && stepNumber >= record.current_step) {
    for (let i = stepNumber + 1; i <= record.total_steps; i++) {
      if (updatedStepsStatus[`step_${i}`] !== 'completed') {
        nextCurrentStep = i
        break
      }
    }
    if (nextCurrentStep === record.current_step) {
      nextCurrentStep = record.total_steps + 1
    }
  }

  const allCompleted = Object.values(updatedStepsStatus).every(
    (s) => s === 'completed' || s === 'skipped'
  )

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('life_event_progress')
    .update({
      steps_status: updatedStepsStatus,
      current_step: nextCurrentStep,
      is_completed: allCompleted,
      completed_at: allCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    return c.json({ success: false, error: 'Eroare la actualizarea pasului' }, 500)
  }

  const procedure = findProcedure(record.event_type)
  const stepTitle = procedure?.steps[stepNumber - 1]?.title ?? `Pasul ${stepNumber}`

  writeAuditEntry({
    userId,
    action: `Pas ${stepNumber} completat: ${stepTitle} (${record.event_title})`,
    actionType: 'life_event_step_completed',
    data: { event_id: id, step: stepNumber, status },
  })

  return c.json({
    success: true,
    data: enrichWithDetails(updated as LifeEventProgress),
  })
})
