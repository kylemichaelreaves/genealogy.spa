/**
 * D3 genealogy map factory — composition root for projection, `geoPath`, zoom, and layers.
 *
 * Layer stack (bottom → top under `data-role="genealogy-map-root"`):
 * - `states` — filtered southern state outlines (muted fill).
 * - `historical-counties` — time-filtered county polygons; highlight uses chart-3.
 * - `connectors` — parent→child quadratic paths with arrow marker.
 * - `nodes` — person circles; `setSelected` dims non-selected and updates radii.
 *
 * Zoom applies to the whole `root` group; circle radii compensate using current scale `k`.
 */
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { GenealogyNode } from '../../../types/genealogy'
import statesTopology from 'us-atlas/states-10m.json'
import {
  GENEALOGY_MAP_CLICK_DISTANCE_PX_SQ,
  GENEALOGY_MAP_CIRCLE_R_MAX,
  GENEALOGY_MAP_CIRCLE_R_MIN,
  GENEALOGY_MAP_CIRCLE_STROKE_BASE,
  GENEALOGY_MAP_DEFAULT_NODE_RADIUS,
  GENEALOGY_MAP_PADDING,
  GENEALOGY_MAP_SELECT_NODE_RADIUS,
  GENEALOGY_MAP_SINGLE_POINT_SCALE,
  GENEALOGY_MAP_SOUTHERN_STATE_FIPS,
  GENEALOGY_MAP_ZOOM_FIT_PADDING,
  GENEALOGY_MAP_ZOOM_TRANSITION_MS,
} from './genealogyMapConstants'
import { createGenealogyMapHistoricalCountiesLayer } from './genealogyMapHistoricalCounties'
import {
  applyGenealogyMapZoomTransition,
  computeGenealogyMapZoomIdentityTransform,
} from './genealogyMapZoomFit'
import { genealogyNodePlainSummary } from '@genealogy/lib/genealogyNodeSummary'
import { isGenealogyNodeInteractiveAtPlayhead } from '@genealogy/lib/genealogyTimelinePresence'
import type { HistoricalCountyFeatureCollection } from '../../../types/historicalCounties'

export type GenealogyMapCallbacks = {
  onNodeEnter: (node: GenealogyNode, event: PointerEvent) => void
  onNodeMove: (node: GenealogyNode, event: PointerEvent) => void
  onNodeLeave: () => void
  onNodeClick: (node: GenealogyNode) => void
}

export type GenealogyMapHandle = {
  setSelected: (id: string | null) => void
  setHistoricalCounties: (fc: HistoricalCountyFeatureCollection | null) => void
  setPlayheadYear: (year: number) => void
  setHighlightedCounties: (keys: ReadonlySet<string> | null) => void
  /**
   * When true (default), highlighted counties stay visible at any playhead year.
   * When false (e.g. timeline mode), highlights use the same year window as other polygons.
   */
  setHighlightedCountiesIgnorePlayhead: (ignore: boolean) => void
  /** When set, counties in these state abbrs (lowercase) ignore the playhead year filter (solo "MS" pins). */
  setPlayheadBypassStateAbbrs: (abbrs: readonly string[] | null) => void
  zoomToNodeIds: (ids: readonly string[]) => void
  /** Fit the viewport to the union of historical county polygons for the given feature keys. */
  zoomToCountyKeys: (keys: ReadonlySet<string>) => void
  /** Timeline scrub: grey out / disable circles for people not yet born at `playheadYear`. */
  setTimelineInteractionContext: (playheadYear: number) => void
  destroy: () => void
}

type StatesTopology = Topology<{ states: GeometryCollection }>

export function createGenealogyMap(
  svgEl: SVGSVGElement,
  nodes: GenealogyNode[],
  width: number,
  height: number,
  callbacks: GenealogyMapCallbacks,
): GenealogyMapHandle {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)

  const defs = svg.append('defs')
  defs
    .append('marker')
    .attr('id', 'genealogy-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'var(--chart-1)')

  const root = svg.append('g').attr('data-role', 'genealogy-map-root')

  const topo = statesTopology as unknown as StatesTopology
  const allStates = feature(topo, topo.objects.states) as unknown as FeatureCollection<Geometry>
  const southern: FeatureCollection<Geometry> = {
    type: 'FeatureCollection',
    features: allStates.features.filter((f: Feature<Geometry>) =>
      GENEALOGY_MAP_SOUTHERN_STATE_FIPS.has(String(f.id)),
    ),
  }

  const projection = d3.geoAlbersUsa().fitExtent(
    [
      [GENEALOGY_MAP_PADDING, GENEALOGY_MAP_PADDING],
      [width - GENEALOGY_MAP_PADDING, height - GENEALOGY_MAP_PADDING],
    ],
    southern,
  )
  const path = d3.geoPath(projection)

  root
    .append('g')
    .attr('data-role', 'states')
    .selectAll('path')
    .data(southern.features)
    .join('path')
    .attr('d', (f) => path(f) ?? '')
    .attr('fill', 'var(--muted)')
    .attr('stroke', 'var(--border)')
    .attr('stroke-width', 0.5)

  // eslint-disable-next-line prefer-const -- assigned once after `updateCircleRadii`; referenced earlier via `getZoomBehavior`
  let zoomBehavior!: d3.ZoomBehavior<SVGSVGElement, unknown>
  const countiesLayer = root.append('g').attr('data-role', 'historical-counties')
  const countiesHandle = createGenealogyMapHistoricalCountiesLayer({
    countiesLayer,
    path,
    width,
    height,
    svg,
    getZoomBehavior: () => zoomBehavior,
  })

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  const projectNode = (n: GenealogyNode): [number, number] | null =>
    projection([n.birthCoords.lng, n.birthCoords.lat])

  const connectors = nodes
    .filter((n) => n.parentId && nodeById.has(n.parentId))
    .map((n) => ({
      child: n,
      parent: nodeById.get(n.parentId!)!,
    }))
    .sort((a, b) => {
      const ay = a.child.birthYear ?? Number.POSITIVE_INFINITY
      const by = b.child.birthYear ?? Number.POSITIVE_INFINITY
      return ay - by
    })

  root
    .append('g')
    .attr('data-role', 'connectors')
    .selectAll('path')
    .data(connectors)
    .join('path')
    .attr('d', ({ parent, child }) => {
      const p = projectNode(parent)
      const c = projectNode(child)
      if (!p || !c) return ''
      const [px, py] = p
      const [cx, cy] = c
      const mx = (px + cx) / 2
      const my = (py + cy) / 2 - Math.abs(cx - px) * 0.2
      return `M ${px} ${py} Q ${mx} ${my} ${cx} ${cy}`
    })
    .attr('fill', 'none')
    .attr('stroke', 'var(--chart-1)')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1.25)
    .attr('stroke-dasharray', '6 3')
    .attr('marker-end', 'url(#genealogy-arrow)')

  let selectedNodeId: string | null = null
  let currentZoomK = 1
  let timelinePlayheadYear = 1748

  function circleRadiusFor(n: GenealogyNode): number {
    const base =
      n.id === selectedNodeId ? GENEALOGY_MAP_SELECT_NODE_RADIUS : GENEALOGY_MAP_DEFAULT_NODE_RADIUS
    return Math.max(GENEALOGY_MAP_CIRCLE_R_MIN, Math.min(GENEALOGY_MAP_CIRCLE_R_MAX, base / currentZoomK))
  }

  function circleStrokeWidth(): number {
    return Math.max(0.6, Math.min(2, GENEALOGY_MAP_CIRCLE_STROKE_BASE / currentZoomK))
  }

  const circles = root
    .append('g')
    .attr('data-role', 'nodes')
    .selectAll<SVGCircleElement, GenealogyNode>('circle')
    .data(nodes, (n) => n.id)
    .join('circle')
    .attr('cx', (n) => projectNode(n)?.[0] ?? -9999)
    .attr('cy', (n) => projectNode(n)?.[1] ?? -9999)
    .attr('r', (n) => circleRadiusFor(n))
    .attr('fill', 'var(--chart-1)')
    .attr('stroke', 'var(--background)')
    .attr('stroke-width', circleStrokeWidth())
    .attr('cursor', 'pointer')
    .attr('data-node-id', (n) => n.id)
    .attr('data-selected', 'false')
    .attr('data-timeline-inactive', 'false')
    .attr('aria-label', (n) => genealogyNodePlainSummary(n))

  let pointerDown: { x: number; y: number; nodeId: string } | null = null

  function nodeInteractiveOnMap(n: GenealogyNode): boolean {
    return isGenealogyNodeInteractiveAtPlayhead(timelinePlayheadYear, n)
  }

  function applyCircleVisualState(): void {
    circles
      .attr('opacity', (n) => {
        const alive = nodeInteractiveOnMap(n)
        const base = alive ? 1 : 0.38
        const sel = selectedNodeId === null || n.id === selectedNodeId ? 1 : 0.3
        return base * sel
      })
      .attr('fill', (n) => (nodeInteractiveOnMap(n) ? 'var(--chart-1)' : 'var(--muted)'))
      .attr('cursor', (n) => (nodeInteractiveOnMap(n) ? 'pointer' : 'default'))
      .style('pointer-events', (n) => (nodeInteractiveOnMap(n) ? 'auto' : 'none'))
      .attr('data-timeline-inactive', (n) => String(!nodeInteractiveOnMap(n)))
      .attr('aria-disabled', (n) => (nodeInteractiveOnMap(n) ? null : 'true'))
  }

  circles
    .on('pointerenter', (event: PointerEvent, n) => {
      if (!nodeInteractiveOnMap(n)) return
      callbacks.onNodeEnter(n, event)
    })
    .on('pointermove', (event: PointerEvent, n) => {
      if (!nodeInteractiveOnMap(n)) return
      callbacks.onNodeMove(n, event)
    })
    .on('pointerleave', () => callbacks.onNodeLeave())
    .on('pointerdown', (event: PointerEvent, n) => {
      if (!nodeInteractiveOnMap(n)) return
      pointerDown = { x: event.clientX, y: event.clientY, nodeId: n.id }
    })
    .on('pointerup', (event: PointerEvent, n) => {
      if (!nodeInteractiveOnMap(n)) return
      const start = pointerDown
      pointerDown = null
      if (!start || start.nodeId !== n.id) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (dx * dx + dy * dy > GENEALOGY_MAP_CLICK_DISTANCE_PX_SQ) return
      callbacks.onNodeClick(n)
    })

  applyCircleVisualState()

  function updateCircleRadii(): void {
    circles.attr('r', (n) => circleRadiusFor(n)).attr('stroke-width', circleStrokeWidth())
  }

  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.8, 6])
    .on('zoom', (event) => {
      currentZoomK = event.transform.k
      root.attr('transform', event.transform.toString())
      updateCircleRadii()
    })

  svg.call(zoomBehavior)

  function setSelected(id: string | null): void {
    selectedNodeId = id
    circles.attr('data-selected', (n) => String(n.id === id))
    applyCircleVisualState()
    updateCircleRadii()
  }

  function setTimelineInteractionContext(playheadYear: number): void {
    timelinePlayheadYear = playheadYear
    applyCircleVisualState()
    updateCircleRadii()
  }

  function zoomToNodeIds(ids: readonly string[]): void {
    if (ids.length === 0) return
    const points: [number, number][] = []
    for (const id of ids) {
      const n = nodeById.get(id)
      if (!n) continue
      const birth = projectNode(n)
      if (birth) points.push(birth)
      if (n.deathCoords) {
        const death = projection([n.deathCoords.lng, n.deathCoords.lat])
        if (death) points.push(death)
      }
    }
    if (points.length === 0) return

    let x0 = points[0][0]
    let y0 = points[0][1]
    let x1 = x0
    let y1 = y0
    for (const [x, y] of points) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }

    const transform = computeGenealogyMapZoomIdentityTransform({
      width,
      height,
      padding: GENEALOGY_MAP_ZOOM_FIT_PADDING,
      x0,
      y0,
      x1,
      y1,
      scaleExtent: zoomBehavior.scaleExtent(),
      singlePointScale: GENEALOGY_MAP_SINGLE_POINT_SCALE,
    })
    applyGenealogyMapZoomTransition(svg, zoomBehavior, transform, GENEALOGY_MAP_ZOOM_TRANSITION_MS)
  }

  function destroy(): void {
    svg.on('.zoom', null)
    svg.selectAll('*').remove()
  }

  return {
    setSelected,
    setHistoricalCounties: countiesHandle.setHistoricalCounties,
    setPlayheadYear: countiesHandle.setPlayheadYear,
    setHighlightedCounties: countiesHandle.setHighlightedCounties,
    setHighlightedCountiesIgnorePlayhead: countiesHandle.setHighlightedCountiesIgnorePlayhead,
    setPlayheadBypassStateAbbrs: countiesHandle.setPlayheadBypassStateAbbrs,
    zoomToNodeIds,
    zoomToCountyKeys: countiesHandle.zoomToCountyKeys,
    setTimelineInteractionContext,
    destroy,
  }
}
