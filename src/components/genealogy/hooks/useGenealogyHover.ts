import type { GenealogyNode } from '../../../types/genealogy'
import { useSelection } from '@genealogy/SelectionContext'
import { useGenealogyNodeCursorTooltip } from './useGenealogyNodeCursorTooltip'

/**
 * Shared hover behavior for both genealogy panels: hovering a node selects it
 * (synced cross-panel via SelectionContext) and shows a tooltip following the
 * cursor; leaving clears both. Each panel keeps its own tooltip overlay so
 * positioning is local, but the hook centralizes the wiring so the two panels
 * cannot drift out of sync.
 */
export function useGenealogyHover() {
  const cursorTip = useGenealogyNodeCursorTooltip()
  const { setSelectedId, pinnedId, setPinnedId, runTimelinePinSync } = useSelection()

  return {
    tooltip: cursorTip.tooltip,
    onEnter(node: GenealogyNode, event: { clientX: number; clientY: number }) {
      setSelectedId(node.id)
      cursorTip.onEnter(node, event)
    },
    onMove(node: GenealogyNode, event: { clientX: number; clientY: number }) {
      cursorTip.onMove(node, event)
    },
    onLeave() {
      setSelectedId(null)
      cursorTip.onLeave()
    },
    onClick(node: GenealogyNode) {
      // Toggle: clicking the already-pinned person unpins; otherwise pin the new one.
      const willUnpin = pinnedId() === node.id
      setPinnedId(willUnpin ? null : node.id)
      if (!willUnpin) {
        runTimelinePinSync(node)
      }
    },
  }
}
