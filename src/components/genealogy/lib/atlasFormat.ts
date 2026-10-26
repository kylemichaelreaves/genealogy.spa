import type { GenealogyNode } from '../../../types/genealogy'

/** Period-style abbreviations used on 19th-century county atlases. */
const ATLAS_STATE_ABBR: Record<string, string> = {
  VA: 'Va.',
  NC: 'N.C.',
  SC: 'S.C.',
  GA: 'Ga.',
  AL: 'Ala.',
  MS: 'Miss.',
  TN: 'Tenn.',
  KY: 'Ky.',
}

/**
 * "Surry County, VA" → "Surry Co., Va."; "Memphis, Shelby County, TN" →
 * "Memphis, Shelby Co., Tenn."; a bare "MS" → "Miss.". Unknown parts pass through.
 */
export function formatAtlasPlace(location: string): string {
  return location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ATLAS_STATE_ABBR[part] ?? part.replace(/\bCounty\b/, 'Co.'))
    .join(', ')
}

const ROMAN: ReadonlyArray<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/** 1 → "I", 7 → "VII". Generations stay well under 40. */
export function toRoman(n: number): string {
  let rest = Math.max(0, Math.floor(n))
  let out = ''
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph
      rest -= value
    }
  }
  return out
}

/** Generation number per node: roots (no parent in the set) are 1. */
export function generationNumbers(nodes: readonly GenealogyNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const memo = new Map<string, number>()
  const depth = (n: GenealogyNode, seen: Set<string>): number => {
    const cached = memo.get(n.id)
    if (cached !== undefined) return cached
    const parent = n.parentId ? byId.get(n.parentId) : undefined
    // Guard against a malformed cycle in hand-edited data.
    const g = parent && !seen.has(parent.id) ? depth(parent, new Set(seen).add(n.id)) + 1 : 1
    memo.set(n.id, g)
    return g
  }
  for (const n of nodes) depth(n, new Set())
  return memo
}

export function formatLifespan(n: GenealogyNode): string {
  if (n.birthYear !== null && n.deathYear !== null) return `${n.birthYear}–${n.deathYear}`
  if (n.birthYear !== null) return `b. ${n.birthYear}`
  if (n.deathYear !== null) return `d. ${n.deathYear}`
  return 'dates unknown'
}

export type AtlasRulerTick = { year: number; leftPct: number; major: boolean }

/** Decade ticks spanning [min, max] rounded out to whole decades; every 50 years is major. */
export function atlasRulerTicks(
  minYear: number,
  maxYear: number,
): {
  start: number
  end: number
  ticks: AtlasRulerTick[]
} {
  const start = Math.floor(minYear / 10) * 10
  const end = Math.max(start + 10, Math.ceil(maxYear / 10) * 10)
  const ticks: AtlasRulerTick[] = []
  for (let y = start; y <= end; y += 10) {
    ticks.push({ year: y, leftPct: ((y - start) / (end - start)) * 100, major: y % 50 === 0 })
  }
  return { start, end, ticks }
}

/** Percent position of `year` on a ruler from `start` to `end`. */
export function atlasRulerPct(year: number, start: number, end: number): number {
  return ((year - start) / Math.max(1, end - start)) * 100
}

/** People shown publicly — `withheld` marks living or possibly-living relatives. */
export function publicGenealogyNodes(nodes: readonly GenealogyNode[]): GenealogyNode[] {
  return nodes.filter((n) => !n.withheld)
}
