import type { GenealogyNode } from '../../../types/genealogy'

/**
 * Map circles: only people with a known birth on or before the playhead are interactive
 * (unknown / future birth → not interactive).
 */
export function isGenealogyNodeInteractiveAtPlayhead(playheadYear: number, node: GenealogyNode): boolean {
  if (node.birthYear === null || !Number.isFinite(node.birthYear)) return false
  return node.birthYear <= playheadYear
}
