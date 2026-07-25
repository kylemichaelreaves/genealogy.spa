import type { GenealogyNode } from '../../../types/genealogy'
import { genealogyNodesForPinnedLineage } from './matchHistoricalCounty'

export type GenealogyTimelineStepKind = 'birth' | 'death'

export type GenealogyTimelineStep = {
  year: number
  kind: GenealogyTimelineStepKind
  nodeId: string
  fullName: string
  /** Birth or death location string for display. */
  locationLabel: string
}

function pushStepsForNode(n: GenealogyNode, byDedupeKey: Map<string, GenealogyTimelineStep>): void {
  if (n.birthYear !== null && Number.isFinite(n.birthYear)) {
    const key = `${n.birthYear}:birth:${n.id}`
    byDedupeKey.set(key, {
      year: n.birthYear,
      kind: 'birth',
      nodeId: n.id,
      fullName: n.fullName,
      locationLabel: n.birthLocation,
    })
  }
  if (n.deathYear !== null && Number.isFinite(n.deathYear)) {
    const key = `${n.deathYear}:death:${n.id}`
    byDedupeKey.set(key, {
      year: n.deathYear,
      kind: 'death',
      nodeId: n.id,
      fullName: n.fullName,
      locationLabel: n.deathLocation ?? '',
    })
  }
}

/**
 * Ordered timeline steps for map playhead scrubbing.
 * When `pinnedId` is set, only that person's lineage (ancestors, self, descendants);
 * otherwise every node in `nodes`.
 */
export function buildGenealogyTimelineSteps(
  nodes: readonly GenealogyNode[],
  pinnedId: string | null,
): GenealogyTimelineStep[] {
  const scoped = pinnedId ? genealogyNodesForPinnedLineage(pinnedId, nodes) : [...nodes]
  const byKey = new Map<string, GenealogyTimelineStep>()
  for (const n of scoped) {
    pushStepsForNode(n, byKey)
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.kind !== b.kind) return a.kind === 'birth' ? -1 : 1
    return a.nodeId.localeCompare(b.nodeId)
  })
}

export function formatTimelineStepSummary(step: GenealogyTimelineStep): string {
  const evt = step.kind === 'birth' ? 'Born' : 'Died'
  // Omit the parens when the location is unknown so we don't render "Died ()".
  const loc = step.locationLabel ? ` (${step.locationLabel})` : ''
  return `${step.fullName} — ${evt}${loc}`
}

/**
 * Screen-reader-friendly label for a timeline mark. Includes the person, the
 * kind of event (birth/death), the year, and (when available) the location, so
 * each mark is uniquely and meaningfully described to assistive tech.
 */
export function formatTimelineStepAriaLabel(step: GenealogyTimelineStep): string {
  const evt = step.kind === 'birth' ? 'Born' : 'Died'
  const loc = step.locationLabel ? `, ${step.locationLabel}` : ''
  return `${step.fullName}, ${evt} ${step.year}${loc}`
}

/**
 * Index of the timeline step to associate with a map node (drawn at birth coords).
 * Prefers birth, then death, then any step for that person.
 */
export function timelineStepIndexForNodeId(
  steps: readonly GenealogyTimelineStep[],
  nodeId: string,
): number | null {
  const birth = steps.findIndex((st) => st.nodeId === nodeId && st.kind === 'birth')
  if (birth >= 0) return birth
  const death = steps.findIndex((st) => st.nodeId === nodeId && st.kind === 'death')
  if (death >= 0) return death
  const any = steps.findIndex((st) => st.nodeId === nodeId)
  return any >= 0 ? any : null
}

/** One event marker on the horizontal year axis (percent from left of the track). */
export type GenealogyTimelineAxisMark = {
  index: number
  leftPct: number
  step: GenealogyTimelineStep
}

/**
 * Places each step on a horizontal axis by calendar year (chronological), with a
 * small horizontal spread when several events share the same year so markers stay clickable.
 */
export function layoutGenealogyTimelineAxis(
  steps: readonly GenealogyTimelineStep[],
): GenealogyTimelineAxisMark[] {
  if (steps.length === 0) return []
  if (steps.length === 1) {
    return [{ index: 0, leftPct: 50, step: steps[0]! }]
  }
  const minY = steps[0]!.year
  const maxY = steps[steps.length - 1]!.year
  const span = Math.max(1, maxY - minY)
  const inset = 4
  const usable = 100 - 2 * inset

  const byYear = new Map<number, number[]>()
  for (let i = 0; i < steps.length; i++) {
    const y = steps[i]!.year
    let arr = byYear.get(y)
    if (!arr) {
      arr = []
      byYear.set(y, arr)
    }
    arr.push(i)
  }

  const leftByIndex = new Map<number, number>()
  for (const indices of byYear.values()) {
    indices.sort((a, b) => a - b)
    const y = steps[indices[0]!]!.year
    const base = inset + ((y - minY) / span) * usable
    const k = indices.length
    const spread = Math.min(4, usable / Math.max(steps.length, 4))
    for (let j = 0; j < k; j++) {
      const idx = indices[j]!
      const off = k === 1 ? 0 : (j - (k - 1) / 2) * spread
      leftByIndex.set(idx, Math.min(100 - inset, Math.max(inset, base + off)))
    }
  }

  return steps.map((st, i) => ({
    index: i,
    leftPct: leftByIndex.get(i) ?? inset + usable / 2,
    step: st,
  }))
}
