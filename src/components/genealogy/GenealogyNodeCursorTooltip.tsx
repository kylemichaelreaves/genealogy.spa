import type { JSX } from 'solid-js'
import CursorLinesTooltip from '@components/shared/CursorLinesTooltip'
import { genealogyNodeSummaryBlocks } from '@genealogy/lib/genealogyNodeSummary'
import type { GenealogyNodeTooltipState } from '@genealogy/hooks/useGenealogyNodeCursorTooltip'

export type { GenealogyNodeTooltipState }

/**
 * Genealogy-specific mapping from {@link GenealogyNodeTooltipState} to {@link CursorLinesTooltip}.
 */
export default function GenealogyNodeCursorTooltip(props: {
  state: GenealogyNodeTooltipState
  testid?: string
}): JSX.Element {
  const position = () => (props.state ? { x: props.state.x, y: props.state.y } : null)
  const title = () => props.state?.node.fullName
  const lines = () => {
    const s = props.state
    if (!s) return []
    const b = genealogyNodeSummaryBlocks(s.node)
    return [b.birthLine, b.deathLine] as const
  }

  return (
    <CursorLinesTooltip
      position={position()}
      dataTestId={props.testid ?? 'genealogy-tooltip'}
      title={title()}
      lines={lines()}
    />
  )
}
