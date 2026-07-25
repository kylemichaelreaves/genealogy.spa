import { createEffect, createMemo, createSignal, untrack, type Accessor } from 'solid-js'
import type { GenealogyNode } from '../../../types/genealogy'
import {
  buildGenealogyTimelineSteps,
  timelineStepIndexForNodeId,
  type GenealogyTimelineStep,
} from '@genealogy/lib/buildGenealogyTimeline'
import { useSelection } from '@genealogy/SelectionContext'

/**
 * Timeline stepping for the genealogy map: derives ordered steps from nodes +
 * optional pin, keeps `stepIndex` and `playheadYear` in sync.
 */
export function useGenealogyTimelineControls(getNodes: Accessor<readonly GenealogyNode[]>) {
  const { pinnedId, setPlayheadYear } = useSelection()
  const steps = createMemo(() => buildGenealogyTimelineSteps(getNodes(), pinnedId()))
  const [stepIndex, setStepIndex] = createSignal(0)

  const currentStep = createMemo((): GenealogyTimelineStep | null => {
    const s = steps()
    const i = stepIndex()
    if (s.length === 0 || i < 0 || i >= s.length) return null
    return s[i]!
  })

  createEffect(() => {
    const s = steps()
    untrack(() => {
      if (s.length === 0) return
      setStepIndex((i) => Math.max(0, Math.min(i, s.length - 1)))
    })
  })

  createEffect(() => {
    const step = currentStep()
    if (!step) return
    untrack(() => setPlayheadYear(step.year))
  })

  const goPrev = () => {
    const i = stepIndex()
    if (i <= 0) return
    const ni = i - 1
    setStepIndex(ni)
    setPlayheadYear(steps()[ni]!.year)
  }

  const goNext = () => {
    const s = steps()
    const i = stepIndex()
    if (i >= s.length - 1) return
    const ni = i + 1
    setStepIndex(ni)
    setPlayheadYear(s[ni]!.year)
  }

  const goToIndex = (target: number) => {
    const s = steps()
    if (target < 0 || target >= s.length) return
    setStepIndex(target)
    setPlayheadYear(s[target]!.year)
  }

  const goToStepForNode = (node: GenealogyNode) => {
    const s = steps()
    const idx = timelineStepIndexForNodeId(s, node.id)
    if (idx === null) return
    goToIndex(idx)
  }

  return {
    steps,
    stepIndex,
    currentStep,
    goPrev,
    goNext,
    goToIndex,
    goToStepForNode,
  }
}
