import type { GenealogyNode } from '../../../types/genealogy'
import { PERSON_CARD_HEIGHT, PERSON_CARD_WIDTH } from './PersonCard'

export type LayoutNode = {
  node: GenealogyNode
  depth: number
  x: number
  y: number
}

export type TreeLayoutOptions = {
  width: number
  rowGap?: number
  siblingGap?: number
  cardWidth?: number
  topPadding?: number
}

const DEFAULT_ROW_GAP = 32
const DEFAULT_SIBLING_GAP = 16
const DEFAULT_TOP_PADDING = 16
// Card dimensions live with `PersonCard` (single source of truth) so the
// layout, the connector overlay, and the rendered card can never drift.

/**
 * Compute one-row-per-generation layout for a flat list of genealogy nodes.
 * Depth is determined by walking parentId pointers; orphans (parentId pointing to
 * a missing node, or null) become their own root at depth 0. Siblings within a
 * row are centered horizontally in the container.
 */
export function useTreeLayout(nodes: GenealogyNode[], options: TreeLayoutOptions): LayoutNode[] {
  const rowGap = options.rowGap ?? DEFAULT_ROW_GAP
  const siblingGap = options.siblingGap ?? DEFAULT_SIBLING_GAP
  const cardWidth = options.cardWidth ?? PERSON_CARD_WIDTH
  const topPadding = options.topPadding ?? DEFAULT_TOP_PADDING

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const depthCache = new Map<string, number>()

  function depthFor(id: string, seen: Set<string>): number {
    const cached = depthCache.get(id)
    if (cached !== undefined) return cached
    if (seen.has(id)) return 0
    const node = byId.get(id)
    if (!node) return 0
    if (node.parentId === null || !byId.has(node.parentId)) {
      depthCache.set(id, 0)
      return 0
    }
    seen.add(id)
    const d = depthFor(node.parentId, seen) + 1
    depthCache.set(id, d)
    return d
  }

  const decorated = nodes.map((node) => ({ node, depth: depthFor(node.id, new Set()) }))

  const byDepth = new Map<number, typeof decorated>()
  for (const item of decorated) {
    const arr = byDepth.get(item.depth) ?? []
    arr.push(item)
    byDepth.set(item.depth, arr)
  }

  // Stable sibling order within each depth: birth year ascending (unknown last),
  // then by id. Matches the connector ordering in `createGenealogyMap` and gives
  // a deterministic DOM / Tab order regardless of how `nodes` was sorted.
  for (const items of byDepth.values()) {
    items.sort((a, b) => {
      const ay = a.node.birthYear ?? Number.POSITIVE_INFINITY
      const by = b.node.birthYear ?? Number.POSITIVE_INFINITY
      if (ay !== by) return ay - by
      return a.node.id.localeCompare(b.node.id)
    })
  }

  const rowHeight = PERSON_CARD_HEIGHT + rowGap

  // Iterate depths in numeric ascending order so the resulting `layout`
  // (and thus DOM / tab order in `TreeCardLayer`) is top-to-bottom by
  // generation regardless of input `nodes` ordering.
  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b)

  const layout: LayoutNode[] = []
  for (const depth of sortedDepths) {
    const items = byDepth.get(depth)!
    const totalWidth = items.length * cardWidth + Math.max(0, items.length - 1) * siblingGap
    const startX = Math.max(0, (options.width - totalWidth) / 2)
    items.forEach((item, idx) => {
      layout.push({
        node: item.node,
        depth: item.depth,
        x: startX + idx * (cardWidth + siblingGap),
        y: topPadding + depth * rowHeight,
      })
    })
  }

  return layout
}
