import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { Button } from '@components/ui/button'

/** Matches Vue: Previous disabled when `isLast`, Next disabled when `isFirst`. */
export default function NavigationButtonGroup(props: {
  label: string
  isFirst: boolean
  isLast: boolean
  goToPrevious: () => void
  goToNext: () => void
  reset?: () => void
  dataTestId?: string
  prevTestId?: string
  nextTestId?: string
  resetTestId?: string
  'aria-label'?: string
}): JSX.Element {
  return (
    <div
      class="inline-flex flex-wrap overflow-hidden rounded-md border border-border"
      role="group"
      data-testid={props.dataTestId}
      aria-label={props['aria-label']}
    >
      <Button
        variant="outline"
        class="rounded-none border-0 border-r border-r-border/20"
        onClick={() => props.goToPrevious()}
        disabled={props.isLast}
        data-testid={props.prevTestId}
      >
        ← Previous {props.label}
      </Button>
      <Button
        variant="outline"
        class={`rounded-none border-0 ${props.reset ? 'border-r border-r-border/20' : ''}`}
        onClick={() => props.goToNext()}
        disabled={props.isFirst}
        data-testid={props.nextTestId}
      >
        Next {props.label} →
      </Button>
      <Show when={props.reset}>
        {(fn) => (
          <Button
            variant="outline"
            class="rounded-none border-0 bg-muted"
            onClick={() => fn()()}
            data-testid={props.resetTestId}
          >
            ✕ Reset {props.label}
          </Button>
        )}
      </Show>
    </div>
  )
}
