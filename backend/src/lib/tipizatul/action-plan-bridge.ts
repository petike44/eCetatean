// Bridge between the hardcoded LifeEventProcedure (Pipeline B) and the
// tipizatul-backed pdf_forms catalog (Pipeline A).
//
// For each step that has an online_action with type='pdf' and form_type
// (Pipeline B), look up whether a tipizatul-sourced row exists with the
// matching legacy form_type (we store this mapping by tag, but for now
// we don't have one). Until we have that mapping table, this is a no-op
// pass-through — the frontend can still link to document-preview by
// form_type, which keeps the existing behaviour.
//
// IMPORTANT: this is the ONLY place that decides whether a step prefers
// a tipizatul slug (Pipeline A) over the legacy form_type (Pipeline B).
// When we do have curated form_type → tipizatul slug mappings, plug them
// in here.

import { supabaseAdmin } from '../supabase'
import type { LifeEventProcedure, LifeEventStep } from '../../types'

/** Curated bridge table. Add entries here as tipizatul-backed forms reach
 *  parity with their legacy generatePDF equivalent. Empty by default —
 *  no entry = keep using form_type (Pipeline B). */
export const FORM_TYPE_TO_TAGS: Record<string, string[]> = {
  // example, kept commented until live data confirms a match:
  // viza_flotant: ['viza flotant', 'reședință'],
  // cerere_drpciv: ['drpciv', 'înmatriculare'],
}

export interface BridgeOptions {
  /** Inject a Supabase client (tests). */
  client?: typeof supabaseAdmin
  /** Override the bridge table (tests). */
  bridge?: Record<string, string[]>
}

/** Walk every step of a LifeEventProcedure and, when we can resolve a
 *  tipizatul slug for its form_type, attach it as `online_action.form_slug`.
 *  When we can't, the step is returned unchanged. */
export async function resolveProcedureActionPlanFormSlugs(
  procedure: LifeEventProcedure,
  opts: BridgeOptions = {}
): Promise<LifeEventProcedure> {
  const bridge = opts.bridge ?? FORM_TYPE_TO_TAGS
  const client = opts.client ?? supabaseAdmin

  // Collect the set of form_types we'd potentially upgrade
  const formTypes = new Set<string>()
  for (const step of procedure.steps) {
    const ft = step.online_action?.form_type
    if (ft && bridge[ft]) formTypes.add(ft)
  }
  if (formTypes.size === 0) return procedure

  // For each known form_type with curated tags, find one tipizatul slug.
  // We pick the most-recently-synced match per form_type. ONE round trip.
  const tagSet = new Set<string>()
  for (const ft of formTypes) for (const tag of bridge[ft]) tagSet.add(tag.toLowerCase())
  if (tagSet.size === 0) return procedure

  const { data, error } = await client
    .from('pdf_forms')
    .select('slug, tags, synced_at')
    .eq('source', 'tipizatul')
    .eq('is_active', true)
    .overlaps('tags', [...tagSet])
    .order('synced_at', { ascending: false })
    .limit(200)
  if (error) {
    console.warn('action-plan bridge fetch failed:', error.message)
    return procedure
  }

  const rows = (data ?? []) as { slug: string; tags: string[] | null; synced_at: string }[]
  const formTypeToSlug = new Map<string, string>()
  for (const ft of formTypes) {
    const tags = bridge[ft].map((t) => t.toLowerCase())
    const hit = rows.find((row) => (row.tags ?? []).some((t) => tags.includes(t.toLowerCase())))
    if (hit) formTypeToSlug.set(ft, hit.slug)
  }

  if (formTypeToSlug.size === 0) return procedure

  const steps = procedure.steps.map((step): LifeEventStep => {
    const oa = step.online_action
    if (!oa || oa.type !== 'pdf' || !oa.form_type) return step
    const slug = formTypeToSlug.get(oa.form_type)
    if (!slug) return step
    return {
      ...step,
      online_action: {
        ...oa,
        // Attach form_slug as an additional hint. Existing form_type stays
        // for backward compat with the frontend; the UI prefers form_slug
        // when present.
        ...(slug ? { form_slug: slug } : {}),
      } as LifeEventStep['online_action'],
    }
  })
  return { ...procedure, steps }
}
