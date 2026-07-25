import type { JSX } from 'solid-js'
import { createMemo } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import type { LayoutNode } from './useTreeLayout'
import { PERSON_CARD_HEIGHT, PERSON_CARD_WIDTH } from './PersonCard'

/**
 * SVG overlay that draws cubic-bezier connector paths between each child and
 * its parent in a layout. Pure render — no event handlers (`pointer-events:none`).
 *
 * Uses `viewBox` + `preserveAspectRatio="none"` so paths stay aligned with the
 * absolutely positioned cards whenever the scroll viewport or column width changes.
 */
export default function TreeConnectorOverlay(props: {
  nodes: GenealogyNode[]
  layout: LayoutNode[]
  width: number
  height: number
}): JSX.Element {
  const viewBox = createMemo(() => `0 0 ${Math.max(1, props.width)} ${Math.max(1, props.height)}`)

  /** One memo ties path geometry to `layout` / size so connectors always track resize. */
  const paths = createMemo(() => {
    const layout = props.layout
    if (layout.length === 0) return []

    const byId = new Map(layout.map((l) => [l.node.id, l]))
    const out: JSX.Element[] = []

    for (const node of props.nodes) {
      if (!node.parentId) continue
      const parent = byId.get(node.parentId)
      const child = byId.get(node.id)
      if (!parent || !child) continue

      const x1 = parent.x + PERSON_CARD_WIDTH / 2
      const y1 = parent.y + PERSON_CARD_HEIGHT
      const x2 = child.x + PERSON_CARD_WIDTH / 2
      const y2 = child.y
      const my = (y1 + y2) / 2
      const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`

      out.push(<path d={d} stroke="var(--chart-1)" stroke-opacity="0.6" stroke-width="1.5" fill="none" />)
    }

    return out
  })

  return (
    <svg
      class="absolute inset-0 block h-full w-full pointer-events-none"
      viewBox={viewBox()}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paths()}
    </svg>
  )
}
