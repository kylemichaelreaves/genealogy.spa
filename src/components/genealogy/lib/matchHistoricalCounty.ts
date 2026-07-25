import type { GenealogyNode } from '../../../types/genealogy'
import type {
  HistoricalCountyFeature,
  HistoricalCountyFeatureCollection,
} from '../../../types/historicalCounties'

/** Matches strings like "Surry County, VA" — case-insensitive on the prefix. */
const COUNTY_LOCATION_PATTERN = /^(.+?)\s+county,\s*([A-Za-z]{2})$/i
/** Two-letter state only, e.g. seed data birthLocation "MS". */
const SOLO_STATE_PATTERN = /^[A-Za-z]{2}$/
/** City (or any label) before a comma and a two-letter state, e.g. "Memphis, TN". */
const CITY_COMMA_STATE_PATTERN = /^[^,]+,\s*([A-Za-z]{2})\s*$/
/** Newberry tags counties dissolved into other jurisdictions with "(ext)" / "(extinct)". */
const EXTINCT_SUFFIX_PATTERN = /\s*\((?:ext|extinct)\)\s*$/i

/**
 * US state abbreviations that have TopoJSON under
 * `{base}/states/{abbr}.topojson` in the historical-counties bucket.
 */
export const HISTORICAL_COUNTIES_DATA_STATES = ['al', 'ga', 'ms', 'nc', 'sc', 'tn', 'va'] as const

const HISTORICAL_COUNTIES_DATA_STATE_SET = new Set<string>(HISTORICAL_COUNTIES_DATA_STATES)

export type ParsedCountyLocation = {
  /** Uppercased county name with the "(ext)" suffix stripped. */
  countyName: string
  stateAbbr: string
}

export function parseCountyLocation(loc: string | null | undefined): ParsedCountyLocation | null {
  if (!loc) return null
  const m = COUNTY_LOCATION_PATTERN.exec(loc.trim())
  if (!m) return null
  return {
    countyName: normalizeCountyName(m[1]),
    stateAbbr: m[2].toUpperCase(),
  }
}

function normalizeCountyName(s: string): string {
  return s.trim().replace(EXTINCT_SUFFIX_PATTERN, '').toUpperCase()
}

/** Stable per-feature key — combines `ID` (which can repeat across versions) with `VERSION`. */
export function getHistoricalCountyKey(f: HistoricalCountyFeature): string {
  return `${f.properties.ID}:${f.properties.VERSION}`
}

export function findCountyFeatureMatches(
  fc: HistoricalCountyFeatureCollection,
  parsed: ParsedCountyLocation,
  year: number | null,
): HistoricalCountyFeature[] {
  return fc.features.filter((f) => {
    const p = f.properties
    if ((p.state_abbr ?? '').toUpperCase() !== parsed.stateAbbr) return false
    if (normalizeCountyName(p.NAME) !== parsed.countyName) return false
    if (year === null || !Number.isFinite(year)) return true
    if (Number.isFinite(p.startYear) && year < p.startYear) return false
    if (Number.isFinite(p.endYear) && year > p.endYear) return false
    return true
  })
}

/**
 * Returns the set of historical-county feature keys that correspond to the
 * given person — birth county at birth year, plus death county at death year
 * if both are populated. Locations that aren't a recognizable "<X> County, <ST>"
 * string (e.g. just "MS" or "Memphis, TN") yield no matches.
 */
function stateAbbrsFromLocationString(loc: string | null | undefined): string[] {
  if (!loc) return []
  const t = loc.trim()
  const county = parseCountyLocation(t)
  if (county) return [county.stateAbbr]
  if (SOLO_STATE_PATTERN.test(t)) return [t.toUpperCase()]
  const citySt = CITY_COMMA_STATE_PATTERN.exec(t)
  if (citySt) return [citySt[1].toUpperCase()]
  return []
}

/**
 * Lowercase state codes to fetch for this person — only states present in the
 * historical-counties S3 dataset ({@link HISTORICAL_COUNTIES_DATA_STATES}).
 */
export function historicalCountyStatesForGenealogyNode(node: GenealogyNode | null | undefined): string[] {
  if (!node) return []
  const acc = new Set<string>()
  for (const ab of stateAbbrsFromLocationString(node.birthLocation)) {
    const k = ab.toLowerCase()
    if (HISTORICAL_COUNTIES_DATA_STATE_SET.has(k)) acc.add(k)
  }
  for (const ab of stateAbbrsFromLocationString(node.deathLocation)) {
    const k = ab.toLowerCase()
    if (HISTORICAL_COUNTIES_DATA_STATE_SET.has(k)) acc.add(k)
  }
  return [...acc].sort()
}

/**
 * State codes to fetch: everyone in `nodes`, plus any focused people (hover /
 * pin) so TanStack Query’s `getStates` reads selection signals and refetches
 * when the set grows (e.g. dynamic tree data).
 */
export function historicalCountyStatesForTreeAndSelection(
  nodes: readonly GenealogyNode[],
  ...focusIds: Array<string | null | undefined>
): string[] {
  const codes = new Set<string>()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const n of nodes) {
    for (const ab of historicalCountyStatesForGenealogyNode(n)) {
      codes.add(ab)
    }
  }
  for (const id of focusIds) {
    if (!id) continue
    const node = byId.get(id)
    if (!node) continue
    for (const ab of historicalCountyStatesForGenealogyNode(node)) {
      codes.add(ab)
    }
  }
  return [...codes].sort()
}

/**
 * Node ids in the pinned person's lineage: ancestors (walk `parentId` from
 * pinned to root), the pinned node, and every descendant in `nodes`.
 */
export function genealogyNodeIdsForPinnedLineage(
  pinnedId: string,
  nodes: readonly GenealogyNode[],
): ReadonlySet<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ids = new Set<string>()
  let cursor: GenealogyNode | undefined = byId.get(pinnedId)
  while (cursor) {
    ids.add(cursor.id)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  function addDescendants(parentKey: string): void {
    for (const child of nodes) {
      if (child.parentId !== parentKey) continue
      ids.add(child.id)
      addDescendants(child.id)
    }
  }
  addDescendants(pinnedId)
  return ids
}

/** All `GenealogyNode` rows that belong to the pinned lineage (see {@link genealogyNodeIdsForPinnedLineage}). */
export function genealogyNodesForPinnedLineage(
  pinnedId: string,
  nodes: readonly GenealogyNode[],
): GenealogyNode[] {
  const ids = genealogyNodeIdsForPinnedLineage(pinnedId, nodes)
  return nodes.filter((n) => ids.has(n.id))
}

/**
 * States whose TopoJSON should load when `pinnedId` is active: union of
 * hints for the pinned node, every ancestor on `parentId`, and every
 * descendant in `nodes`. Georgia on a child (e.g. Walton County, GA) is
 * included when an ancestor like Ransom is pinned.
 */
export function historicalCountyStatesForPinnedLineageContext(
  pinnedId: string,
  nodes: readonly GenealogyNode[],
): string[] {
  const codes = new Set<string>()
  for (const n of genealogyNodesForPinnedLineage(pinnedId, nodes)) {
    for (const ab of historicalCountyStatesForGenealogyNode(n)) {
      codes.add(ab)
    }
  }
  return [...codes].sort()
}

export function findCountyKeysForNode(
  fc: HistoricalCountyFeatureCollection | null | undefined,
  node: GenealogyNode | null | undefined,
): Set<string> {
  const keys = new Set<string>()
  if (!fc || !node) return keys

  const birth = parseCountyLocation(node.birthLocation)
  if (birth) {
    for (const f of findCountyFeatureMatches(fc, birth, node.birthYear)) {
      keys.add(getHistoricalCountyKey(f))
    }
  }

  const death = parseCountyLocation(node.deathLocation)
  if (death) {
    for (const f of findCountyFeatureMatches(fc, death, node.deathYear)) {
      keys.add(getHistoricalCountyKey(f))
    }
  }

  return keys
}

/**
 * County polygon keys for a single timeline event (birth or death at `year`),
 * when the location parses as "<County> County, ST".
 */
export function findCountyKeysForTimelineStep(
  fc: HistoricalCountyFeatureCollection | null | undefined,
  node: GenealogyNode | null | undefined,
  kind: 'birth' | 'death',
  year: number,
): Set<string> {
  const keys = new Set<string>()
  if (!fc || !node) return keys
  if (kind === 'birth') {
    const parsed = parseCountyLocation(node.birthLocation)
    if (parsed) {
      for (const f of findCountyFeatureMatches(fc, parsed, year)) {
        keys.add(getHistoricalCountyKey(f))
      }
    }
    return keys
  }
  const parsed = parseCountyLocation(node.deathLocation)
  if (parsed) {
    for (const f of findCountyFeatureMatches(fc, parsed, year)) {
      keys.add(getHistoricalCountyKey(f))
    }
  }
  return keys
}
