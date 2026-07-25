import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

export type CursorPosition = { x: number; y: number }

/**
 * Generic positioned-tooltip shell that follows the cursor. Supplies the chrome
 * (popover background, border, shadow, z-index, pointer-events:none) and lets
 * callers decide what to render inside via `children`. `position` is in viewport
 * coordinates (clientX/clientY).
 */
export default function CursorTooltip(props: {
  position: CursorPosition | null
  children: JSX.Element
  offsetX?: number
  offsetY?: number
  maxWidth?: number
  dataTestId?: string
}): JSX.Element {
  return (
    <Show when={props.position}>
      {(p) => (
        <div
          class="fixed z-50 pointer-events-none rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md"
          style={{
            left: `${p().x + (props.offsetX ?? 12)}px`,
            top: `${p().y + (props.offsetY ?? 12)}px`,
            'max-width': `${props.maxWidth ?? 240}px`,
          }}
          data-testid={props.dataTestId}
        >
          {props.children}
        </div>
      )}
    </Show>
  )
}
