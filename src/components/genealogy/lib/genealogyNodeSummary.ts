import type { GenealogyNode } from '../../../types/genealogy'

export type GenealogyNodeSummaryBlocks = {
  fullName: string
  birthLine: string
  deathLine: string | null
}

/**
 * Structured lines for UI (genealogy cursor tooltip + map `aria-label`). Keeps copy aligned with
 * {@link genealogyNodePlainSummary} for map `aria-label`.
 */
export function genealogyNodeSummaryBlocks(n: GenealogyNode): GenealogyNodeSummaryBlocks {
  const fullName = n.fullName
  let birthLine: string
  if (n.birthYear !== null) {
    birthLine = `Born ${n.birthYear} · ${n.birthLocation}`
  } else if (n.birthLocation) {
    birthLine = `Birth: ${n.birthLocation}`
  } else {
    birthLine = 'Birth: unknown'
  }
  let deathLine: string | null = null
  if (n.deathYear !== null) {
    deathLine = n.deathLocation ? `Died ${n.deathYear} · ${n.deathLocation}` : `Died ${n.deathYear}`
  }
  return { fullName, birthLine, deathLine }
}

/** One plain string for map circle `aria-label` (no native `<title>`). */
export function genealogyNodePlainSummary(n: GenealogyNode): string {
  const { fullName, birthLine, deathLine } = genealogyNodeSummaryBlocks(n)
  return [fullName, birthLine, ...(deathLine ? [deathLine] : [])].join('. ')
}
