import type { JSX } from 'solid-js'
import { createMemo, onCleanup, onMount } from 'solid-js'
import { genealogyData } from '../../data/genealogy'
import ThemeToggle from '@components/shared/ThemeToggle'
import GenealogyMapPanel from '@genealogy/map/GenealogyMapPanel'
import AtlasRegister from './AtlasRegister'
import AtlasTimeline from './AtlasTimeline'
import { SelectionProvider, useSelection } from './SelectionContext'
import { useGenealogyTimelineControls } from '@genealogy/hooks/useGenealogyTimelineControls'
import { generationNumbers, publicGenealogyNodes } from '@genealogy/lib/atlasFormat'

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Two-letter state codes at the end of each place, e.g. "Surry County, VA" → "VA". */
function stateCodes(locations: readonly (string | null)[]): Set<string> {
  const out = new Set<string>()
  for (const loc of locations) {
    const last = loc?.split(',').at(-1)?.trim()
    if (last && /^[A-Z]{2}$/.test(last)) out.add(last)
  }
  return out
}

function AtlasPlate(): JSX.Element {
  const nodes = publicGenealogyNodes(genealogyData)
  const generations = generationNumbers(genealogyData)
  const withheldGenerations = [
    ...new Set(genealogyData.filter((n) => n.withheld).map((n) => generations.get(n.id) ?? 1)),
  ].sort((a, b) => a - b)

  const years = nodes.flatMap((n) => [n.birthYear, n.deathYear]).filter((y): y is number => y !== null)
  const firstYear = Math.min(...years)
  const lastYear = Math.max(...years)
  const generationCount = Math.max(...generations.values())
  const stateCount = stateCodes(nodes.flatMap((n) => [n.birthLocation, n.deathLocation])).size

  const { pinnedId, registerTimelinePinSync } = useSelection()
  const timeline = useGenealogyTimelineControls(() => nodes)
  onMount(() => registerTimelinePinSync((node) => timeline.goToStepForNode(node)))
  onCleanup(() => registerTimelinePinSync(null))

  const activeId = createMemo(() => pinnedId() ?? timeline.currentStep()?.nodeId ?? null)

  return (
    <section
      class="mx-auto max-w-[1440px] border border-atlas-rule bg-card px-4 py-5 text-card-foreground outline outline-1 -outline-offset-[6px] outline-atlas-rule sm:px-8 sm:py-6"
      data-testid="genealogy-page"
    >
      <header class="flex items-end justify-between gap-4 border-b border-atlas-rule pb-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="m-0 text-sm tracking-[0.16em] text-atlas-kicker [font-variant-caps:all-small-caps]">
            Plate I · The Reaves line
          </p>
          <h1 class="m-0 font-atlas-display text-[28px] font-semibold italic leading-[1.05] sm:text-[40px]">
            From Surry County to Mississippi, {firstYear}–{lastYear}
          </h1>
        </div>
        <div class="flex shrink-0 items-center gap-4">
          <p class="m-0 hidden text-base italic text-atlas-kicker md:block">
            {capitalize(countWord(generationCount))} generations · {countWord(stateCount)} states
          </p>
          <ThemeToggle />
        </div>
      </header>

      <div class="mt-4 grid grid-cols-1 gap-x-7 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div class="order-1 min-w-0">
          <GenealogyMapPanel nodes={nodes} focusStep={() => timeline.currentStep()} />
        </div>
        <div class="order-3 min-w-0 lg:order-2">
          <AtlasRegister
            nodes={nodes}
            generations={generations}
            activeId={activeId()}
            withheldGenerations={withheldGenerations}
          />
        </div>
        <div class="order-2 min-w-0 lg:order-3 lg:col-span-2">
          <AtlasTimeline
            steps={timeline.steps}
            stepIndex={timeline.stepIndex}
            currentStep={timeline.currentStep}
            onPrev={timeline.goPrev}
            onNext={timeline.goNext}
            onSelectIndex={timeline.goToIndex}
          />
        </div>
      </div>
    </section>
  )
}

export default function GenealogyPage(): JSX.Element {
  return (
    <SelectionProvider>
      <AtlasPlate />
    </SelectionProvider>
  )
}
