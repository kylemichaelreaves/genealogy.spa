import type { Accessor, JSX } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'

export const PERSON_CARD_WIDTH = 120
export const PERSON_CARD_HEIGHT = 64

export default function PersonCard(props: {
  node: GenealogyNode
  isSelected: boolean
  isPinned: boolean
  /** When false, card is muted and does not emit pointer or click handlers (timeline “not yet born”). */
  interactive?: boolean | Accessor<boolean>
  onEnter: (node: GenealogyNode, event: MouseEvent) => void
  onMove: (node: GenealogyNode, event: MouseEvent) => void
  onLeave: () => void
  onClick: (node: GenealogyNode) => void
  ref?: (el: HTMLButtonElement | undefined) => void
}): JSX.Element {
  const canInteract = () => {
    const i = props.interactive
    if (i === undefined) return true
    return typeof i === 'function' ? i() : i
  }

  const lifespan = () => {
    const b = props.node.birthYear ?? '?'
    const d = props.node.deathYear ?? ''
    return d ? `${b}–${d}` : `${b}`
  }

  return (
    <button
      type="button"
      ref={(el) => props.ref?.(el)}
      // Reset native button defaults so the card visuals come entirely from the
      // utility classes below (text-align, font, background, border).
      class="block appearance-none bg-transparent text-left font-[inherit] rounded-md border px-2 py-1.5 transition-colors overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chart-1)] focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      classList={{
        'cursor-default opacity-55 grayscale': !canInteract(),
        'cursor-pointer text-foreground': canInteract() && !props.isSelected && !props.isPinned,
        'bg-card border-border hover:bg-popover hover:border-[var(--chart-1)]':
          canInteract() && !props.isSelected && !props.isPinned,
        'bg-popover border-[var(--chart-1)] shadow-[inset_3px_0_0_var(--chart-1)]':
          canInteract() && (props.isSelected || props.isPinned),
        'ring-2 ring-[var(--chart-1)]/40': canInteract() && props.isPinned,
        'bg-muted/50 border-border text-muted-foreground': !canInteract(),
      }}
      style={{ width: `${PERSON_CARD_WIDTH}px`, height: `${PERSON_CARD_HEIGHT}px` }}
      // `disabled` covers keyboard (Tab skips, Enter/Space ignored) and pointer
      // events; aria-disabled is mirrored for screen readers that need it.
      disabled={!canInteract()}
      aria-disabled={!canInteract()}
      data-timeline-inactive={canInteract() ? 'false' : 'true'}
      onMouseEnter={(e) => props.onEnter(props.node, e)}
      onMouseMove={(e) => props.onMove(props.node, e)}
      onMouseLeave={() => props.onLeave()}
      onFocus={(e) => props.onEnter(props.node, e as unknown as MouseEvent)}
      onBlur={() => props.onLeave()}
      onClick={() => props.onClick(props.node)}
      data-testid={`genealogy-person-${props.node.id}`}
      data-pinned={props.isPinned ? 'true' : 'false'}
    >
      <div class="text-[13px] font-semibold leading-tight truncate">{props.node.fullName}</div>
      <div class="text-[12px] text-muted-foreground leading-tight">{lifespan()}</div>
      <div class="text-[12px] italic text-muted-foreground leading-tight truncate">
        {props.node.birthLocation}
      </div>
    </button>
  )
}
