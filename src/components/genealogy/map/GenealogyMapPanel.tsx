import type { JSX } from 'solid-js'
import { onCleanup, onMount } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import GenealogyMapTimelineAxis from './GenealogyMapTimelineAxis'
import GenealogyMapTimelineRail from './GenealogyMapTimelineRail'
import MapView from './MapView'
import GenealogyNodeCursorTooltip from '@genealogy/GenealogyNodeCursorTooltip'
import { useSelection } from '@genealogy/SelectionContext'
import { useGenealogyNodeCursorTooltip } from '@genealogy/hooks/useGenealogyNodeCursorTooltip'
import { useGenealogyTimelineControls } from '@genealogy/hooks/useGenealogyTimelineControls'

export default function GenealogyMapPanel(props: { nodes: GenealogyNode[] }): JSX.Element {
  const { registerTimelinePinSync } = useSelection()
  const timeline = useGenealogyTimelineControls(() => props.nodes)
  const timelineTooltip = useGenealogyNodeCursorTooltip()

  onMount(() => {
    registerTimelinePinSync((node) => timeline.goToStepForNode(node))
  })
  onCleanup(() => registerTimelinePinSync(null))

  return (
    <div class="relative w-full" data-testid="genealogy-map-panel">
      <GenealogyMapTimelineAxis
        nodes={props.nodes}
        steps={timeline.steps}
        stepIndex={timeline.stepIndex}
        onSelectIndex={timeline.goToIndex}
        onNodeTooltipEnter={timelineTooltip.onEnter}
        onNodeTooltipMove={timelineTooltip.onMove}
        onNodeTooltipLeave={timelineTooltip.onLeave}
      />
      <div class="relative">
        <MapView nodes={props.nodes} getTimelineFocusStep={() => timeline.currentStep()} />
        <GenealogyMapTimelineRail
          nodes={props.nodes}
          steps={timeline.steps}
          stepIndex={timeline.stepIndex}
          currentStep={timeline.currentStep}
          onPrev={timeline.goPrev}
          onNext={timeline.goNext}
          onNodeTooltipEnter={timelineTooltip.onEnter}
          onNodeTooltipMove={timelineTooltip.onMove}
          onNodeTooltipLeave={timelineTooltip.onLeave}
        />
      </div>
      <GenealogyNodeCursorTooltip state={timelineTooltip.tooltip()} testid="genealogy-timeline-tooltip" />
    </div>
  )
}
