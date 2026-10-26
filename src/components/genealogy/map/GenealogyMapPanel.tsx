import type { JSX } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import type { GenealogyTimelineStep } from '@genealogy/lib/buildGenealogyTimeline'
import MapView from './MapView'

function LegendRow(props: { children: JSX.Element; label: string }): JSX.Element {
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
        <LegendRow label="A life's removal">
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
