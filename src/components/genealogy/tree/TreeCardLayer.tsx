import type { JSX } from 'solid-js'
import { For } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import PersonCard from './PersonCard'
import type { LayoutNode } from './useTreeLayout'

/**
 * Absolute-positioned layer of PersonCards driven by a layout. Forwards hover
 * events and selection state up to the parent panel.
 */
export default function TreeCardLayer(props: {
  layout: LayoutNode[]
  selectedId: string | null
  pinnedId: string | null
  /** Per-node: false mutes the card and blocks hover/click (timeline playhead before birth). */
  isNodeInteractive: (node: GenealogyNode) => boolean
  onEnter: (node: GenealogyNode, event: MouseEvent) => void
  onMove: (node: GenealogyNode, event: MouseEvent) => void
  onLeave: () => void
  onClick: (node: GenealogyNode) => void
  registerCardRef: (id: string, el: HTMLButtonElement | undefined) => void
}): JSX.Element {
  return (
    <For each={props.layout}>
      {(item) => (
        <div class="absolute" style={{ transform: `translate(${item.x}px, ${item.y}px)` }}>
          <PersonCard
            node={item.node}
            isSelected={props.selectedId === item.node.id}
            isPinned={props.pinnedId === item.node.id}
            interactive={() => props.isNodeInteractive(item.node)}
            onEnter={props.onEnter}
            onMove={props.onMove}
            onLeave={props.onLeave}
            onClick={props.onClick}
            ref={(el) => props.registerCardRef(item.node.id, el)}
          />
        </div>
      )}
    </For>
  )
}
