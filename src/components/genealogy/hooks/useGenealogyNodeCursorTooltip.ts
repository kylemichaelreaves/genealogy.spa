import { createSignal } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'

export type GenealogyNodeCursorPointer = { clientX: number; clientY: number }

export type GenealogyNodeTooltipState = { node: GenealogyNode; x: number; y: number } | null

/**
 * Cursor-following tooltip state for a {@link GenealogyNode} — same payload as
 * {@link GenealogyNodeCursorTooltip}. Used by map/tree hover and by timeline UI so copy stays consistent.
 */
export function useGenealogyNodeCursorTooltip() {
  const [tooltip, setTooltip] = createSignal<GenealogyNodeTooltipState>(null)

  return {
    tooltip,
    onEnter(node: GenealogyNode, event: GenealogyNodeCursorPointer) {
      setTooltip({ node, x: event.clientX, y: event.clientY })
    },
    onMove(node: GenealogyNode, event: GenealogyNodeCursorPointer) {
      setTooltip({ node, x: event.clientX, y: event.clientY })
    },
    onLeave() {
      setTooltip(null)
    },
  }
}
