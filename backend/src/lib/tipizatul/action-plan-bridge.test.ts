import { describe, it, expect } from 'vitest'
import { resolveProcedureActionPlanFormSlugs } from './action-plan-bridge'
import type { LifeEventProcedure } from '../../types'

function makeProcedure(): LifeEventProcedure {
  return {
    event_type: 'demo',
    title: 'Demo',
    emoji: '🚗',
    summary: 's',
    total_estimated_time: '1h',
    steps: [
      {
        order: 1,
        title: 'Cere viza flotant',
        office: 'DGEP',
        address: '...',
        hours: '...',
        phone: '...',
        documents: [],
        fee: 'gratuit',
        deadline: 'azi',
        form_type: 'viza_flotant',
        category: 'docs',
        payment_url: null,
        tip: null,
        online_action: {
          label: 'Descarcă cerere',
          type: 'pdf',
          form_type: 'viza_flotant',
        },
      },
      {
        order: 2,
        title: 'Pas fără PDF',
        office: 'X',
        address: '',
        hours: '',
        phone: '',
        documents: [],
        fee: '',
        deadline: '',
        form_type: null,
        category: 'onsite',
        payment_url: null,
        tip: null,
      },
    ],
  }
}

/** Tiny chainable mock matching the small subset of PostgREST we call. */
function makeClient(rows: unknown[]) {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  for (const op of ['select', 'eq', 'overlaps', 'order', 'limit']) {
    chain[op] = () => chain
  }
  ;(chain as unknown as { then: unknown }).then = (
    resolve: (val: { data: unknown[]; error: unknown }) => unknown,
  ) => resolve({ data: rows, error: null })
  return { from: () => chain } as never
}

describe('resolveProcedureActionPlanFormSlugs', () => {
  it('is a no-op when the bridge table has no entry for the form_type', async () => {
    const proc = makeProcedure()
    // empty bridge — pipeline B keeps running.
    const client = makeClient([])
    const out = await resolveProcedureActionPlanFormSlugs(proc, { client, bridge: {} })
    expect(out.steps[0].online_action?.form_slug).toBeUndefined()
    expect(out.steps[0].online_action?.form_type).toBe('viza_flotant')
  })

  it('attaches form_slug when a tipizatul row matches by tag', async () => {
    const proc = makeProcedure()
    const client = makeClient([
      { slug: 'tipizatul-viza-flotant-cluj', tags: ['viza flotant'], synced_at: '2026-05-01' },
    ])
    const out = await resolveProcedureActionPlanFormSlugs(proc, {
      client,
      bridge: { viza_flotant: ['viza flotant', 'reședință'] },
    })
    expect(out.steps[0].online_action?.form_slug).toBe('tipizatul-viza-flotant-cluj')
    // Backward-compat: form_type stays so legacy Pipeline B callers keep working.
    expect(out.steps[0].online_action?.form_type).toBe('viza_flotant')
  })

  it('keeps form_type-only when no tipizatul row carries the required tag', async () => {
    const proc = makeProcedure()
    const client = makeClient([
      { slug: 'tipizatul-other', tags: ['other'], synced_at: '2026-05-01' },
    ])
    const out = await resolveProcedureActionPlanFormSlugs(proc, {
      client,
      bridge: { viza_flotant: ['viza flotant'] },
    })
    expect(out.steps[0].online_action?.form_slug).toBeUndefined()
  })

  it('ignores steps without an online_action or pdf-type action', async () => {
    const proc = makeProcedure()
    const client = makeClient([
      { slug: 'tipizatul-viza-flotant-cluj', tags: ['viza flotant'], synced_at: '2026-05-01' },
    ])
    const out = await resolveProcedureActionPlanFormSlugs(proc, {
      client,
      bridge: { viza_flotant: ['viza flotant'] },
    })
    // step 2 has no online_action — should be returned unchanged
    expect(out.steps[1].online_action).toBeUndefined()
  })
})
