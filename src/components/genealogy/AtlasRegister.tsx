import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'
import type { GenealogyNode } from '../../types/genealogy'
import { formatAtlasPlace, formatLifespan, toRoman } from '@genealogy/lib/atlasFormat'
import { useSelection } from '@genealogy/SelectionContext'
import { useGenealogyHover } from '@genealogy/hooks/useGenealogyHover'

/**
 * "Register of descent": one row per person, numbered by generation. Replaces the
 * card tree from the original layout — the register reads in order on any width
 * and carries birth/death places inline, so it needs no tooltip.
 */
export default function AtlasRegister(props: {
  nodes: readonly GenealogyNode[]
  generations: ReadonlyMap<string, number>
  /** Person whose event the timeline is on (or the pinned person). */
  activeId: string | null
  /** Generations left off the page (see `withheld` on GenealogyNode). */
  withheldGenerations: readonly number[]
}): JSX.Element {
  const { selectedId } = useSelection()
  const hover = useGenealogyHover()

  const places = (n: GenealogyNode) => {
    const born = `b. ${formatAtlasPlace(n.birthLocation)}`
    return n.deathLocation ? `${born} · d. ${formatAtlasPlace(n.deathLocation)}` : born
  }

  return (
    <section
      aria-labelledby="atlas-register-h"
      class="flex min-w-0 flex-col gap-1"
      data-testid="genealogy-register"
    >
      <h2
        id="atlas-register-h"
        class="mb-1.5 text-base font-medium leading-normal tracking-[0.16em] text-atlas-kicker [font-variant-caps:all-small-caps]"
      >
        Register of descent
      </h2>
      <ol class="m-0 flex list-none flex-col gap-1 p-0">
        <For each={props.nodes}>
          {(n) => {
            const active = () => props.activeId === n.id
            const hovered = () => selectedId() === n.id
            return (
              <li>
                <button
                  type="button"
                  class="flex w-full min-h-11 cursor-pointer items-start gap-2.5 border px-3 py-2.5 text-left font-[inherit] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  classList={{
                    'border-atlas-rule bg-atlas-active': active(),
                    'border-transparent hover:bg-atlas-active/60': !active(),
                    'bg-atlas-active/60': hovered() && !active(),
                  }}
                  aria-current={active() ? 'true' : undefined}
                  data-testid={`genealogy-person-${n.id}`}
                  data-active={active() ? 'true' : 'false'}
                  onMouseEnter={(e) => hover.onEnter(n, e)}
                  onMouseLeave={() => hover.onLeave()}
                  onFocus={(e) => hover.onEnter(n, e as unknown as MouseEvent)}
                  onBlur={() => hover.onLeave()}
                  onClick={() => hover.onClick(n)}
                >
                  <span
                    class="w-8 shrink-0 font-atlas-display text-[22px] font-semibold leading-none"
                    classList={{ 'text-atlas-accent-text': active(), 'text-atlas-kicker': !active() }}
                  >
                    {toRoman(props.generations.get(n.id) ?? 1)}
                  </span>
                  <span class="flex min-w-0 flex-col gap-px">
                    <span class="text-[17px] font-semibold leading-tight">
                      {n.fullName} <span class="font-normal text-atlas-kicker">{formatLifespan(n)}</span>
                    </span>
                    <span class="text-sm italic leading-snug text-muted-foreground">{places(n)}</span>
                  </span>
                </button>
              </li>
            )
          }}
        </For>
      </ol>
      <Show when={props.withheldGenerations.length > 0}>
        <p class="mt-1.5 flex gap-2.5 px-3 text-sm italic text-atlas-kicker" data-testid="genealogy-withheld">
          <span class="w-8 shrink-0 font-atlas-display text-[22px] font-semibold not-italic leading-none">
            {props.withheldGenerations.map(toRoman).join(', ')}
          </span>
          <span>
            {props.withheldGenerations.length === 1 ? 'A later generation' : 'Later generations'}, withheld
            while living relatives may be named.
          </span>
        </p>
      </Show>
    </section>
  )
}
