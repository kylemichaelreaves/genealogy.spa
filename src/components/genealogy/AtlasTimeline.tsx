import type { JSX } from 'solid-js'
import { createMemo, For, Show } from 'solid-js'
import type { GenealogyTimelineStep } from '@genealogy/lib/buildGenealogyTimeline'
import { formatTimelineStepAriaLabel } from '@genealogy/lib/buildGenealogyTimeline'
import { atlasRulerPct, atlasRulerTicks, formatAtlasPlace } from '@genealogy/lib/atlasFormat'

type Props = {
  steps: () => readonly GenealogyTimelineStep[]
  stepIndex: () => number
  currentStep: () => GenealogyTimelineStep | null
  onPrev: () => void
  onNext: () => void
  onSelectIndex: (index: number) => void
}

function stepSentence(step: GenealogyTimelineStep): string {
  const verb = step.kind === 'birth' ? 'born' : 'died'
  return step.locationLabel
    ? `${step.fullName} ${verb}, ${formatAtlasPlace(step.locationLabel)}`
    : `${step.fullName} ${verb}`
}

function Chevron(props: { direction: 'left' | 'right' }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d={props.direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

const roundButton =
  'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40'

/**
 * Footer of the plate: previous / next event with the current year, and an
 * engraved-style ruler with a mark per birth (●) and death (✕).
 */
export default function AtlasTimeline(props: Props): JSX.Element {
  const ruler = createMemo(() => {
    const s = props.steps()
    if (s.length === 0) return null
    return atlasRulerTicks(s[0]!.year, s[s.length - 1]!.year)
  })
  const pct = (year: number) => {
    const r = ruler()
    return r ? atlasRulerPct(year, r.start, r.end) : 0
  }
  const atStart = () => props.stepIndex() <= 0
  const atEnd = () => props.stepIndex() >= props.steps().length - 1

  return (
    <div
      class="flex flex-col gap-3 border-t border-atlas-rule pt-3 lg:flex-row lg:items-center lg:gap-7"
      data-testid="genealogy-timeline"
    >
      <Show
        when={props.steps().length > 0}
        fallback={<p class="text-sm italic text-muted-foreground">No dated births or deaths to show.</p>}
      >
        <div class="flex items-center gap-3 lg:w-[470px] lg:shrink-0">
          <button
            type="button"
            class={`${roundButton} border-atlas-rule bg-popover text-foreground hover:bg-accent`}
            aria-label="Previous event"
            disabled={atStart()}
            data-testid="genealogy-timeline-prev"
            onClick={() => props.onPrev()}
          >
            <Chevron direction="left" />
          </button>
          <div class="flex min-w-0 flex-1 flex-col">
            <span
              class="font-atlas-display text-[30px] font-semibold leading-none lg:text-[34px]"
              data-testid="genealogy-timeline-year"
            >
              {props.currentStep()?.year ?? '—'}
            </span>
            <span class="text-[15px] italic leading-snug text-muted-foreground">
              {props.currentStep() ? stepSentence(props.currentStep()!) : ''}
              <span class="whitespace-nowrap" data-testid="genealogy-timeline-position">
                {' '}
                · {props.stepIndex() + 1} of {props.steps().length}
              </span>
            </span>
          </div>
          <button
            type="button"
            class={`${roundButton} border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
            aria-label="Next event"
            disabled={atEnd()}
            data-testid="genealogy-timeline-next"
            onClick={() => props.onNext()}
          >
            <Chevron direction="right" />
          </button>
        </div>

        <div
          class="relative mx-2 h-14 min-w-0 flex-none select-none lg:flex-1"
          role="group"
          aria-label="Events by year"
          data-testid="genealogy-timeline-axis"
        >
          <div class="absolute inset-x-0 top-[22px] border-t border-atlas-rule" aria-hidden="true" />
          <For each={ruler()?.ticks ?? []}>
            {(t) => (
              <>
                <span
                  aria-hidden="true"
                  class="absolute border-l border-atlas-rule"
                  style={{
                    left: `${t.leftPct}%`,
                    top: t.major ? '14px' : '18px',
                    height: t.major ? '16px' : '8px',
                  }}
                />
                <Show when={t.major}>
                  <span
                    aria-hidden="true"
                    class="absolute top-[34px] -translate-x-1/2 text-sm text-muted-foreground"
                    style={{ left: `${t.leftPct}%` }}
                  >
                    {t.year}
                  </span>
                </Show>
              </>
            )}
          </For>
          <For each={props.steps()}>
            {(step, i) => {
              const active = () => props.stepIndex() === i()
              return (
                <button
                  type="button"
                  class="absolute top-[3px] flex size-6 -translate-x-1/2 cursor-pointer items-center justify-center bg-transparent p-0 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  classList={{
                    'text-atlas-accent-text': active(),
                    'text-atlas-kicker hover:text-foreground': !active(),
                    'text-[13px]': step.kind === 'birth',
                    'text-[14px]': step.kind === 'death',
                  }}
                  style={{ left: `${pct(step.year)}%` }}
                  aria-label={formatTimelineStepAriaLabel(step)}
                  aria-current={active() ? 'step' : undefined}
                  data-testid="genealogy-timeline-axis-mark"
                  data-step-index={String(i())}
                  onClick={() => props.onSelectIndex(i())}
                >
                  {step.kind === 'birth' ? '●' : '✕'}
                </button>
              )
            }}
          </For>
          <Show when={props.currentStep()}>
            {(step) => (
              <span
                aria-hidden="true"
                class="pointer-events-none absolute top-0 h-[30px] border-l-2 border-primary"
                style={{ left: `${pct(step().year)}%` }}
              />
            )}
          </Show>
        </div>
      </Show>
    </div>
  )
}
