import type { JSX } from 'solid-js'
import { createMemo, For, Show } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import {
  formatTimelineStepAriaLabel,
  layoutGenealogyTimelineAxis,
  type GenealogyTimelineStep,
} from '@genealogy/lib/buildGenealogyTimeline'
import type { GenealogyNodeCursorPointer } from '@genealogy/hooks/useGenealogyNodeCursorTooltip'

type Props = {
  nodes: readonly GenealogyNode[]
  steps: () => readonly GenealogyTimelineStep[]
  stepIndex: () => number
  onSelectIndex: (index: number) => void
  onNodeTooltipEnter: (node: GenealogyNode, event: GenealogyNodeCursorPointer) => void
  onNodeTooltipMove: (node: GenealogyNode, event: GenealogyNodeCursorPointer) => void
  onNodeTooltipLeave: () => void
}

export default function GenealogyMapTimelineAxis(props: Props): JSX.Element {
  const nodeById = createMemo(() => new Map(props.nodes.map((n) => [n.id, n])))
  const marks = createMemo(() => layoutGenealogyTimelineAxis(props.steps()))
  const yearRange = createMemo(() => {
    const s = props.steps()
    if (s.length === 0) return null
    return { min: s[0]!.year, max: s[s.length - 1]!.year }
  })

  return (
    <div
      class="mb-3 rounded-lg border border-border bg-card px-3 py-3 shadow-sm"
      data-testid="genealogy-timeline-axis"
      role="region"
      aria-label="Event timeline by year"
    >
      <Show
        when={props.steps().length > 0}
        fallback={
          <p class="text-center text-xs text-muted-foreground">No dated events to show on the timeline.</p>
        }
      >
        <div class="relative h-12 w-full select-none">
          <div
            class="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border"
            aria-hidden="true"
          />
          <For each={marks()}>
            {(mark) => {
              const active = () => props.stepIndex() === mark.index
              const kind = mark.step.kind
              const node = () => nodeById().get(mark.step.nodeId)
              return (
                <button
                  type="button"
                  class="absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ left: `${mark.leftPct}%` }}
                  aria-label={formatTimelineStepAriaLabel(mark.step)}
                  aria-current={active() ? 'true' : 'false'}
                  data-testid="genealogy-timeline-axis-mark"
                  data-step-index={String(mark.index)}
                  classList={{
                    'bg-chart-3': kind === 'birth',
                    'bg-chart-1': kind === 'death',
                    'ring-2 ring-primary ring-offset-2 ring-offset-card scale-125': active(),
                    'opacity-90 hover:opacity-100': !active(),
                  }}
                  onPointerEnter={(e) => {
                    const n = node()
                    if (n) props.onNodeTooltipEnter(n, e)
                  }}
                  onPointerMove={(e) => {
                    const n = node()
                    if (n) props.onNodeTooltipMove(n, e)
                  }}
                  onPointerLeave={() => props.onNodeTooltipLeave()}
                  onClick={() => props.onSelectIndex(mark.index)}
                />
              )
            }}
          </For>
        </div>
        <div class="mt-1 flex justify-between text-[10px] font-medium tabular-nums text-muted-foreground">
          <span data-testid="genealogy-timeline-axis-min-year">{yearRange()?.min}</span>
          <span data-testid="genealogy-timeline-axis-max-year">{yearRange()?.max}</span>
        </div>
      </Show>
    </div>
  )
}
