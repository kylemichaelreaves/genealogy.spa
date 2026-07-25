import type { JSX } from 'solid-js'
import { createEffect, createMemo } from 'solid-js'
import { useElementSize } from '@composables/useElementSize'
import type { GenealogyNode } from '../../../types/genealogy'
import GenealogyNodeCursorTooltip from '@genealogy/GenealogyNodeCursorTooltip'
import { isGenealogyTreeCardInteractive } from '@genealogy/lib/genealogyTimelinePresence'
import { useSelection } from '@genealogy/SelectionContext'
import { useGenealogyHover } from '@genealogy/hooks/useGenealogyHover'
import { PERSON_CARD_HEIGHT } from './PersonCard'
import TreeCardLayer from './TreeCardLayer'
import TreeConnectorOverlay from './TreeConnectorOverlay'
import { useTreeLayout } from './useTreeLayout'

const BOTTOM_PADDING = 16
const MIN_HEIGHT = 320

export default function FamilyTree(props: { nodes: GenealogyNode[] }): JSX.Element {
  const [dims, attachWrapper] = useElementSize()
  const { selectedId, pinnedId, playheadYear } = useSelection()
  const hover = useGenealogyHover()

  const layout = createMemo(() => {
    const width = dims().w
    if (width <= 0) return []
    return useTreeLayout(props.nodes, { width })
  })

  const totalHeight = createMemo(() => {
    const items = layout()
    if (!items.length) return 0
    return Math.max(...items.map((l) => l.y + PERSON_CARD_HEIGHT)) + BOTTOM_PADDING
  })

  const cardRefs = new Map<string, HTMLButtonElement>()

  function registerCardRef(id: string, el: HTMLButtonElement | undefined) {
    if (el) cardRefs.set(id, el)
    else cardRefs.delete(id)
  }

  createEffect(() => {
    const id = selectedId()
    if (!id) return
    cardRefs.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  return (
    <div
      ref={(el) => attachWrapper(el)}
      class="relative w-full h-full overflow-auto bg-card rounded-md border border-border"
      data-testid="genealogy-family-tree"
    >
      <div class="relative w-full" style={{ height: `${Math.max(totalHeight(), MIN_HEIGHT)}px` }}>
        <TreeConnectorOverlay nodes={props.nodes} layout={layout()} width={dims().w} height={totalHeight()} />
        <TreeCardLayer
          layout={layout()}
          selectedId={selectedId()}
          pinnedId={pinnedId()}
          isNodeInteractive={(n) => isGenealogyTreeCardInteractive(playheadYear(), n)}
          onEnter={hover.onEnter}
          onMove={hover.onMove}
          onLeave={hover.onLeave}
          onClick={hover.onClick}
          registerCardRef={registerCardRef}
        />
      </div>
      <GenealogyNodeCursorTooltip state={hover.tooltip()} testid="genealogy-tree-tooltip" />
    </div>
  )
}
