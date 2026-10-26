/**
 * Atlas annotations on the genealogy map:
 * - `removals` — dotted curve from each person's birthplace to their place of death.
 * - `deaths` — a ✕ at each place of death.
 * - `state-labels` — spaced small-caps state names.
 * - `place-labels` — italic place names, nudged apart so neighbours don't overlap.
 *
 * Glyphs and labels are drawn in screen units: each sits in a `translate(x,y)
 * scale(1/k)` group so it keeps its size while the map root zooms.
 */
import type * as d3 from 'd3'
import type { Feature, Geometry } from 'geojson'
import type { GenealogyNode } from '../../../types/genealogy'
import { formatAtlasPlace } from '@genealogy/lib/atlasFormat'

type Point = [number, number]
type Root = d3.Selection<SVGGElement, unknown, null, undefined>

const STATE_NAMES: Record<string, string> = {
  '01': 'Alabama',
  '05': 'Arkansas',
  '12': 'Florida',
  '13': 'Georgia',
  '21': 'Kentucky',
  '22': 'Louisiana',
  '28': 'Mississippi',
  '37': 'North Carolina',
  '40': 'Oklahoma',
  '45': 'South Carolina',
  '47': 'Tennessee',
  '48': 'Texas',
  '51': 'Virginia',
  '54': 'West Virginia',
}

const LABEL_FONT_PX = 13
const LABEL_LINE_PX = 15
/** Rough italic Garamond advance per character at 13px — good enough for overlap tests. */
const LABEL_CHAR_PX = 6.2
const LABEL_GAP_PX = 9
/** Map width × zoom needed before state names / all place names are drawn. */
const STATE_LABELS_MIN_ROOM_PX = 480
const PLACE_LABELS_MIN_ROOM_PX = 640

export type PlaceLabelInput = { key: string; text: string; x: number; y: number }
export type PlacedLabel = PlaceLabelInput & { anchor: 'start' | 'end'; dx: number; dy: number }

/**
 * Greedy placement: labels sit beside their point (left of it in the eastern
 * third of the map, so they stay on-canvas), then step down a line at a time
 * until they clear every label already placed.
 */
export function layoutPlaceLabels(places: readonly PlaceLabelInput[], width: number): PlacedLabel[] {
  const boxes: { x0: number; x1: number; y0: number; y1: number }[] = []
  const sorted = [...places].sort((a, b) => a.y - b.y || a.x - b.x)
  return sorted.map((p) => {
    const anchor: 'start' | 'end' = p.x > width * 0.66 ? 'end' : 'start'
    const dx = anchor === 'start' ? LABEL_GAP_PX : -LABEL_GAP_PX
    const w = p.text.length * LABEL_CHAR_PX
    const x0 = anchor === 'start' ? p.x + dx : p.x + dx - w
    const tries = [0, LABEL_LINE_PX, -LABEL_LINE_PX, 2 * LABEL_LINE_PX, -2 * LABEL_LINE_PX, 3 * LABEL_LINE_PX]
    let chosen = tries[0]!
    for (const t of tries) {
      const y0 = p.y + t - LABEL_FONT_PX / 2
      const y1 = y0 + LABEL_FONT_PX
      const clash = boxes.some((b) => x0 < b.x1 && x0 + w > b.x0 && y0 < b.y1 && y1 > b.y0)
      if (!clash) {
        chosen = t
        break
      }
    }
    boxes.push({ x0, x1: x0 + w, y0: p.y + chosen - LABEL_FONT_PX / 2, y1: p.y + chosen + LABEL_FONT_PX / 2 })
    return { ...p, anchor, dx, dy: chosen + LABEL_FONT_PX * 0.35 }
  })
}

/** Quadratic curve between two points, bowed to one side. */
function bowedPath(a: Point, b: Point, bend: number): string {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return `M ${a[0]} ${a[1]} Q ${mx - dy * bend} ${my + dx * bend} ${b[0]} ${b[1]}`
}

/** Dotted birth → death curves. Draw before the node circles so the dots sit on top. */
export function drawGenealogyRemovals(
  root: Root,
  nodes: readonly GenealogyNode[],
  project: (lng: number, lat: number) => Point | null,
): void {
  const legs = nodes.flatMap((n) => {
    if (!n.deathCoords) return []
    const a = project(n.birthCoords.lng, n.birthCoords.lat)
    const b = project(n.deathCoords.lng, n.deathCoords.lat)
    return a && b ? [{ id: n.id, d: bowedPath(a, b, 0.18) }] : []
  })
  root
    .append('g')
    .attr('data-role', 'removals')
    .attr('pointer-events', 'none')
    .selectAll('path')
    .data(legs)
    .join('path')
    .attr('d', (l) => l.d)
    .attr('data-node-id', (l) => l.id)
    .attr('fill', 'none')
    .attr('stroke', 'var(--chart-1)')
    .attr('stroke-width', 2.2)
    .attr('stroke-dasharray', '1 5')
    .attr('stroke-linecap', 'round')
    .attr('vector-effect', 'non-scaling-stroke')
}

export type GenealogyMapAnnotationsHandle = {
  setZoom: (k: number) => void
  setActivePlace: (location: string | null) => void
}

/** Death crosses, state names and place labels. Draw after the node circles. */
export function drawGenealogyAnnotations(options: {
  root: Root
  nodes: readonly GenealogyNode[]
  project: (lng: number, lat: number) => Point | null
  states: readonly Feature<Geometry>[]
  centroid: (f: Feature<Geometry>) => Point
  width: number
}): GenealogyMapAnnotationsHandle {
  const { root, nodes, project, states, centroid, width } = options

  const deaths = nodes.flatMap((n) => {
    const p = n.deathCoords ? project(n.deathCoords.lng, n.deathCoords.lat) : null
    return p ? [{ id: n.id, p }] : []
  })
  const deathGroups = root
    .append('g')
    .attr('data-role', 'deaths')
    .attr('pointer-events', 'none')
    .selectAll<SVGGElement, { id: string; p: Point }>('g')
    .data(deaths)
    .join('g')
    .attr('data-node-id', (d) => d.id)
  deathGroups
    .append('path')
    .attr('d', 'M-4,-4L4,4M4,-4L-4,4')
    .attr('stroke', 'var(--map-death)')
    .attr('stroke-width', 1.8)
    .attr('stroke-linecap', 'round')

  const stateLabels = states.flatMap((f) => {
    const name = STATE_NAMES[String(f.id)]
    const c = centroid(f)
    return name && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? [{ name, p: c }] : []
  })
  const stateGroups = root
    .append('g')
    .attr('data-role', 'state-labels')
    .attr('pointer-events', 'none')
    .attr('aria-hidden', 'true')
    .selectAll<SVGGElement, { name: string; p: Point }>('g')
    .data(stateLabels)
    .join('g')
  stateGroups
    .append('text')
    .text((s) => s.name.toUpperCase())
    .attr('text-anchor', 'middle')
    .attr('font-family', 'var(--font-atlas-body)')
    .attr('font-size', 10)
    .attr('letter-spacing', '0.3em')
    .attr('fill', 'var(--map-state-label)')

  // One label per distinct place, whether someone was born or died there.
  const placeByText = new Map<string, PlaceLabelInput>()
  for (const n of nodes) {
    const spots: [string | null, { lat: number; lng: number } | null][] = [
      [n.birthLocation, n.birthCoords],
      [n.deathLocation, n.deathCoords],
    ]
    for (const [loc, coords] of spots) {
      if (!loc || !coords || placeByText.has(loc)) continue
      const p = project(coords.lng, coords.lat)
      if (p) placeByText.set(loc, { key: loc, text: formatAtlasPlace(loc), x: p[0], y: p[1] })
    }
  }
  const placed = layoutPlaceLabels([...placeByText.values()], width)
  const placeGroups = root
    .append('g')
    .attr('data-role', 'place-labels')
    .attr('pointer-events', 'none')
    .selectAll<SVGGElement, PlacedLabel>('g')
    .data(placed)
    .join('g')
    .attr('data-place', (l) => l.key)
  const placeText = placeGroups
    .append('text')
    .text((l) => l.text)
    .attr('x', (l) => l.dx)
    .attr('y', (l) => l.dy)
    .attr('text-anchor', (l) => l.anchor)
    .attr('font-family', 'var(--font-atlas-body)')
    .attr('font-style', 'italic')
    .attr('font-size', LABEL_FONT_PX)
    .attr('fill', 'var(--foreground)')
    .attr('stroke', 'var(--map-halo)')
    .attr('stroke-width', 3)
    .attr('stroke-linejoin', 'round')
    .attr('paint-order', 'stroke')

  let zoomK = 1
  let activeKey: string | null = null

  // On a narrow or zoomed-out map, every label would pile up: keep only the
  // active place until there is room (map width in screen px at this zoom).
  function applyLabelDensity(): void {
    const room = width * zoomK
    stateGroups.attr('display', room >= STATE_LABELS_MIN_ROOM_PX ? null : 'none')
    placeGroups.attr('display', (l) =>
      room >= PLACE_LABELS_MIN_ROOM_PX || l.key === activeKey ? null : 'none',
    )
  }

  function setZoom(k: number): void {
    zoomK = k
    const s = 1 / k
    deathGroups.attr('transform', (d) => `translate(${d.p[0]},${d.p[1]}) scale(${s})`)
    stateGroups.attr('transform', (d) => `translate(${d.p[0]},${d.p[1]}) scale(${s})`)
    placeGroups.attr('transform', (l) => `translate(${l.x},${l.y}) scale(${s})`)
    applyLabelDensity()
  }

  function setActivePlace(location: string | null): void {
    activeKey = location
    placeText
      .attr('fill', (l) => (l.key === location ? 'var(--atlas-accent-text)' : 'var(--foreground)'))
      .attr('font-weight', (l) => (l.key === location ? 600 : 400))
    placeGroups.attr('data-active', (l) => String(l.key === location))
    if (location) placeGroups.filter((l) => l.key === location).raise()
    applyLabelDensity()
  }

  setZoom(1)
  setActivePlace(null)
  return { setZoom, setActivePlace }
}
