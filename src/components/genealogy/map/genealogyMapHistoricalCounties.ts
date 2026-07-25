import * as d3 from 'd3'
import type {
  HistoricalCountyFeature,
  HistoricalCountyFeatureCollection,
} from '../../../types/historicalCounties'
import {
  GENEALOGY_MAP_SINGLE_POINT_SCALE,
  GENEALOGY_MAP_ZOOM_FIT_PADDING,
  GENEALOGY_MAP_ZOOM_TRANSITION_MS,
} from './genealogyMapConstants'
import {
  applyGenealogyMapZoomTransition,
  computeGenealogyMapZoomIdentityTransform,
} from './genealogyMapZoomFit'
import { getHistoricalCountyKey } from '@genealogy/lib/matchHistoricalCounty'

export type GenealogyMapHistoricalCountiesHandle = {
  setHistoricalCounties: (fc: HistoricalCountyFeatureCollection | null) => void
  setPlayheadYear: (year: number) => void
  setHighlightedCounties: (keys: ReadonlySet<string> | null) => void
  setHighlightedCountiesIgnorePlayhead: (ignore: boolean) => void
  setPlayheadBypassStateAbbrs: (abbrs: readonly string[] | null) => void
  zoomToCountyKeys: (keys: ReadonlySet<string>) => void
}

export type CreateGenealogyMapHistoricalCountiesLayerOptions = {
  countiesLayer: d3.Selection<SVGGElement, unknown, null, undefined>
  /** `GeoPath` generics vary by d3-geo version; keep permissive for `.attr('d', f => path(f))`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3.GeoPath first type param is GeoPermissibleObjects; using any keeps call sites simple
  path: d3.GeoPath<any, HistoricalCountyFeature>
  width: number
  height: number
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  getZoomBehavior: () => d3.ZoomBehavior<SVGSVGElement, unknown>
}

/**
 * Historical county polygons: join by {@link getHistoricalCountyKey}, playhead visibility,
 * highlight styling, and zoom-to-keys using the same bbox→transform math as node zoom.
 */
export function createGenealogyMapHistoricalCountiesLayer(
  options: CreateGenealogyMapHistoricalCountiesLayerOptions,
): GenealogyMapHistoricalCountiesHandle {
  const { countiesLayer, path, width, height, svg, getZoomBehavior } = options

  let countyPaths: d3.Selection<SVGPathElement, HistoricalCountyFeature, SVGGElement, unknown> | null = null
  let currentPlayheadYear: number | null = null
  let highlightedCountyKeys: ReadonlySet<string> | null = null
  let highlightedCountiesIgnorePlayhead = true
  let playheadBypassStateAbbrs: ReadonlySet<string> | null = null

  function isHighlighted(f: HistoricalCountyFeature): boolean {
    return highlightedCountyKeys !== null && highlightedCountyKeys.has(getHistoricalCountyKey(f))
  }

  function applyCountiesVisibility(): void {
    if (!countyPaths) return
    const year = currentPlayheadYear
    countyPaths.style('display', (f) => {
      if (highlightedCountiesIgnorePlayhead && isHighlighted(f)) return null
      const st = String(f.properties.state_abbr ?? '').toLowerCase()
      if (playheadBypassStateAbbrs?.has(st)) return null
      if (year === null || !Number.isFinite(year)) return 'none'
      const { startYear, endYear } = f.properties
      const startOk = !Number.isFinite(startYear) || year >= startYear
      const endOk = !Number.isFinite(endYear) || year <= endYear
      return startOk && endOk ? null : 'none'
    })
  }

  function applyCountiesHighlightStyle(): void {
    if (!countyPaths) return
    countyPaths
      .attr('fill', (f) => (isHighlighted(f) ? 'var(--chart-3)' : 'var(--chart-1)'))
      .attr('stroke', (f) => (isHighlighted(f) ? 'var(--chart-3)' : 'var(--chart-1)'))
      .attr('fill-opacity', (f) => (isHighlighted(f) ? 0.6 : 0.08))
      .attr('stroke-opacity', (f) => (isHighlighted(f) ? 1 : 0.45))
      .attr('stroke-width', (f) => (isHighlighted(f) ? 1 : 0.25))
      .attr('data-highlighted', (f) => (isHighlighted(f) ? 'true' : 'false'))
    if (highlightedCountyKeys && highlightedCountyKeys.size > 0) {
      countyPaths.filter((f) => isHighlighted(f)).raise()
    }
  }

  function setHistoricalCounties(fc: HistoricalCountyFeatureCollection | null): void {
    countiesLayer.selectAll('path').remove()
    playheadBypassStateAbbrs = null
    if (!fc || fc.features.length === 0) {
      countyPaths = null
      return
    }
    countyPaths = countiesLayer
      .selectAll<SVGPathElement, HistoricalCountyFeature>('path')
      .data(fc.features, getHistoricalCountyKey)
      .join('path')
      .attr('d', (f) => path(f) ?? '')
      .attr('pointer-events', 'none')
      .attr('data-state-abbr', (f) => f.properties.state_abbr)
      .attr('data-start-year', (f) => f.properties.startYear)
      .attr('data-end-year', (f) => f.properties.endYear)
    applyCountiesHighlightStyle()
    applyCountiesVisibility()
  }

  function setPlayheadYear(year: number): void {
    currentPlayheadYear = year
    applyCountiesVisibility()
  }

  function setHighlightedCounties(keys: ReadonlySet<string> | null): void {
    highlightedCountyKeys = keys && keys.size > 0 ? keys : null
    applyCountiesHighlightStyle()
    applyCountiesVisibility()
  }

  function setHighlightedCountiesIgnorePlayhead(ignore: boolean): void {
    highlightedCountiesIgnorePlayhead = ignore
    applyCountiesVisibility()
  }

  function setPlayheadBypassStateAbbrs(abbrs: readonly string[] | null): void {
    playheadBypassStateAbbrs = abbrs?.length ? new Set(abbrs.map((x) => x.toLowerCase())) : null
    applyCountiesVisibility()
  }

  function zoomToCountyKeys(keys: ReadonlySet<string>): void {
    if (!countyPaths || keys.size === 0) return
    const features = countyPaths.data().filter((f) => keys.has(getHistoricalCountyKey(f)))
    if (features.length === 0) return

    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const f of features) {
      const b = path.bounds(f)
      x0 = Math.min(x0, b[0][0])
      y0 = Math.min(y0, b[0][1])
      x1 = Math.max(x1, b[1][0])
      y1 = Math.max(y1, b[1][1])
    }
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return

    const zoomBehavior = getZoomBehavior()
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

  return {
    setHistoricalCounties,
    setPlayheadYear,
    setHighlightedCounties,
    setHighlightedCountiesIgnorePlayhead,
    setPlayheadBypassStateAbbrs,
    zoomToCountyKeys,
  }
}
