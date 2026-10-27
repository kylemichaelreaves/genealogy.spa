import type { JSX } from 'solid-js'
import { createSignal, createUniqueId } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import type { GenealogyTimelineStep } from '@genealogy/lib/buildGenealogyTimeline'
import MapView from './MapView'

const REMOVAL_GLOSS =
  '“Removal” is the period word for moving one’s household: records of the time say a family “removed to Mississippi.” Each dotted line runs from where a person was born to where they died.'

/**
 * A legend label with a gloss. The key is pointer-events-none so the map under
 * it stays draggable; only this term opts back in. The gloss shows on hover and
 * on keyboard focus, and a tap opens it too, since touch has no hover.
 */
function GlossedTerm(props: { term: string; gloss: string }): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const glossId = createUniqueId()
  return (
    <span class="relative">
      <button
        type="button"
        class="pointer-events-auto cursor-help rounded-sm underline decoration-atlas-kicker decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-describedby={glossId}
        data-testid="genealogy-legend-removal"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        {props.term}
      </button>
      <span
        id={glossId}
        role="tooltip"
        hidden={!open()}
        class="absolute bottom-full left-0 mb-2 w-64 border border-atlas-rule bg-popover px-3 py-2 text-[13px] leading-snug text-popover-foreground shadow-md"
        data-testid="genealogy-legend-removal-gloss"
      >
        {props.gloss}
      </span>
    </span>
  )
}

function LegendRow(props: { children: JSX.Element; label: JSX.Element }): JSX.Element {
  return (
    <div class="flex items-center gap-2.5">
      <svg aria-hidden="true" width="26" height="12" viewBox="0 0 26 12">
        {props.children}
      </svg>
      <span>{props.label}</span>
    </div>
  )
}

/** The map in its double-ruled frame, with the atlas "Explanation" key. */
export default function GenealogyMapPanel(props: {
  nodes: GenealogyNode[]
  focusStep: () => GenealogyTimelineStep | null
}): JSX.Element {
  return (
    <figure
      class="relative m-0 border-[3px] border-double border-atlas-rule bg-map-ground p-1 sm:p-1.5"
      data-testid="genealogy-map-panel"
    >
      <MapView nodes={props.nodes} getTimelineFocusStep={props.focusStep} />
      <div
        class="pointer-events-none absolute bottom-3 left-3 hidden flex-col gap-1 border border-atlas-rule bg-popover px-3.5 py-2.5 text-sm sm:flex"
        data-testid="genealogy-map-legend"
      >
        <p class="m-0 mb-0.5 text-[13px] tracking-[0.16em] text-atlas-kicker [font-variant-caps:all-small-caps]">
          Explanation
        </p>
        <LegendRow label="Birthplace">
          <circle cx="13" cy="6" r="4.5" fill="var(--chart-1)" stroke="var(--map-halo)" stroke-width="1.5" />
        </LegendRow>
        <LegendRow label="Place of death">
          <path
            d="M9 2L17 10M17 2L9 10"
            stroke="var(--map-death)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </LegendRow>
        <LegendRow label="Line of descent">
          <path d="M1 6H25" stroke="var(--chart-1)" stroke-width="1.6" />
        </LegendRow>
        <LegendRow label={<GlossedTerm term="A life's removal" gloss={REMOVAL_GLOSS} />}>
          <path
            d="M1 6H25"
            stroke="var(--chart-1)"
            stroke-width="2.2"
            stroke-dasharray="1 4"
            stroke-linecap="round"
          />
        </LegendRow>
      </div>
    </figure>
  )
}
