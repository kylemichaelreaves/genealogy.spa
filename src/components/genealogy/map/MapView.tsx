import type { JSX } from 'solid-js'
import { createEffect, createMemo, onCleanup, untrack } from 'solid-js'
import { useElementSize } from '@composables/useElementSize'
import { useHistoricalCountiesForStates } from '@api/hooks/historicalCounties/useHistoricalCountiesForStates'
import type { GenealogyNode } from '../../../types/genealogy'
import type { GenealogyTimelineStep } from '@genealogy/lib/buildGenealogyTimeline'
import { createGenealogyMap, type GenealogyMapHandle } from './createGenealogyMap'
import {
  findCountyKeysForTimelineStep,
  historicalCountyStatesForPinnedLineageContext,
  historicalCountyStatesForTreeAndSelection,
} from '@genealogy/lib/matchHistoricalCounty'
import GenealogyNodeCursorTooltip from '@genealogy/GenealogyNodeCursorTooltip'
import { useSelection } from '@genealogy/SelectionContext'
import { useGenealogyHover } from '@genealogy/hooks/useGenealogyHover'

const ASPECT = 0.55 // height / width — fits the southern strip without too much vertical letterboxing

/**
 * Pinned: fetch states for the pinned person’s lineage (ancestors, self,
 * descendants) so e.g. GA loads when viewing Ransom (child born in Walton GA).
 * Unpinned: whole tree (+ hover) for map context.
 */
function statesForCountyTopoFetch(
  nodes: readonly GenealogyNode[],
  pinned: string | null,
  selected: string | null,
): string[] {
  if (pinned) {
    return historicalCountyStatesForPinnedLineageContext(pinned, nodes)
  }
  return historicalCountyStatesForTreeAndSelection(nodes, null, selected)
}

export type MapViewProps = {
  nodes: GenealogyNode[]
  /** Active timeline step — used to zoom to the associated county when available. */
  getTimelineFocusStep?: () => GenealogyTimelineStep | null
}

export default function MapView(props: MapViewProps): JSX.Element {
  let svgEl: SVGSVGElement | undefined
  const [dims, attachWrapper] = useElementSize()
  // `useElementSize` fires on every ResizeObserver tick, including height-only
  // changes. The map only depends on width (height is derived via ASPECT), so
  // memoize width to avoid rebuilding the entire D3 chart on height jitter.
  const width = createMemo(() => dims().w)
  const { selectedId, pinnedId, playheadYear } = useSelection()
  const hover = useGenealogyHover()

  const counties = useHistoricalCountiesForStates(
    () => statesForCountyTopoFetch(props.nodes, pinnedId(), selectedId()),
    () => pinnedId() ?? '',
  )

  // Counties for the active timeline step’s event location (birth or death),
  // matching `findCountyKeysForTimelineStep` / zoom.
  const highlightedCountyKeys = createMemo<ReadonlySet<string> | null>(() => {
    void counties.status
    void counties.fetchStatus
    const fc = counties.data
    if (!fc) return null
    const step = props.getTimelineFocusStep?.() ?? null
    if (!step) return null
    const node = props.nodes.find((n) => n.id === step.nodeId) ?? null
    const keys = findCountyKeysForTimelineStep(fc, node, step.kind, step.year)
    return keys.size > 0 ? keys : null
  })

  let handle: GenealogyMapHandle | null = null

  createEffect(() => {
    const el = svgEl
    const w = width()
    if (!el || w <= 0) return
    const h = Math.max(240, Math.round(w * ASPECT))

    handle?.destroy()
    handle = createGenealogyMap(el, props.nodes, w, h, {
      onNodeEnter: hover.onEnter,
      onNodeMove: hover.onMove,
      onNodeLeave: hover.onLeave,
      onNodeClick: hover.onClick,
    })

    // Initial sync of independent reactive sources without subscribing the
    // build effect to them — dedicated effects below handle their updates.
    untrack(() => {
      handle?.setSelected(selectedId())
      handle?.setPlayheadYear(playheadYear())
      handle?.setTimelineInteractionContext(playheadYear())
      handle?.setHighlightedCountiesIgnorePlayhead(false)
      const data = counties.data
      const needStates = statesForCountyTopoFetch(props.nodes, pinnedId(), selectedId())
      if (data && needStates.length > 0) handle?.setHistoricalCounties(data)
      else handle?.setHistoricalCounties(null)
      handle?.setHighlightedCounties(highlightedCountyKeys())
    })
  })

  // Sync external selection changes (from the tree panel) to the map without re-rendering.
  // Read the signal into a local before the optional chain so the effect tracks
  // it even on the first run when `handle` is still null.
  createEffect(() => {
    const id = selectedId()
    handle?.setSelected(id)
  })

  createEffect(() => {
    const year = playheadYear()
    handle?.setPlayheadYear(year)
  })

  createEffect(() => {
    const year = playheadYear()
    handle?.setTimelineInteractionContext(year)
  })

  createEffect(() => {
    const needStates = statesForCountyTopoFetch(props.nodes, pinnedId(), selectedId())
    void counties.status
    void counties.fetchStatus
    const data = counties.data
    if (!handle) return
    if (needStates.length === 0) {
      handle.setHistoricalCounties(null)
      handle.setHighlightedCounties(highlightedCountyKeys())
      return
    }
    if (!data) return
    handle.setHistoricalCounties(data)
    handle.setPlayheadYear(playheadYear())
    handle.setHighlightedCounties(highlightedCountyKeys())
  })

  createEffect(() => {
    const keys = highlightedCountyKeys()
    handle?.setHighlightedCounties(keys)
  })

  // Zoom to the active timeline event's county (or fall back to the node).
  createEffect(() => {
    const step = props.getTimelineFocusStep?.() ?? null
    void counties.status
    void counties.fetchStatus
    void playheadYear()
    if (!handle || !step) return
    const fc = counties.data
    if (!fc) return
    const node = props.nodes.find((n) => n.id === step.nodeId) ?? null
    const keys = findCountyKeysForTimelineStep(fc, node, step.kind, step.year)
    if (keys.size > 0) {
      handle.zoomToCountyKeys(keys)
    } else {
      handle.zoomToNodeIds([step.nodeId])
    }
  })

  onCleanup(() => {
    handle?.destroy()
    handle = null
  })

  return (
    <div ref={(el) => attachWrapper(el)} class="relative w-full" data-testid="genealogy-map">
      <svg
        ref={(el) => {
          svgEl = el
        }}
        class="block w-full bg-card rounded-md border border-border"
        data-testid="genealogy-map-svg"
      />
      <GenealogyNodeCursorTooltip state={hover.tooltip()} testid="genealogy-map-tooltip" />
    </div>
  )
}
