import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'
import CursorTooltip from './CursorTooltip'

export type CursorLinesTooltipProps = {
  position: { x: number; y: number } | null
  /** Primary line (e.g. a name or title). */
  title?: string | null
  /** Detail lines shown under the title (muted). Null/undefined entries are skipped. */
  lines?: readonly (string | null | undefined)[]
  dataTestId?: string
}

/**
 * Reusable cursor-following tooltip: title + optional detail lines over {@link CursorTooltip}.
 * Domain-specific formatters should map their model to `title` / `lines` and keep this component generic.
 */
export default function CursorLinesTooltip(props: CursorLinesTooltipProps): JSX.Element {
  const detailLines = () => (props.lines ?? []).filter((x): x is string => Boolean(x))

  return (
    <CursorTooltip position={props.position} dataTestId={props.dataTestId ?? 'cursor-lines-tooltip'}>
      <Show when={props.title}>{(t) => <div class="font-semibold text-[13px]">{t()}</div>}</Show>
      <For each={detailLines()}>{(line) => <div class="text-muted-foreground">{line}</div>}</For>
    </CursorTooltip>
  )
}
