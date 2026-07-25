import { describe, expect, it } from 'vitest'
import {
  isGenealogyNodeInteractiveAtPlayhead,
  isGenealogyTreeCardInteractive,
} from '@genealogy/lib/genealogyTimelinePresence'
import type { GenealogyNode } from '../../src/types/genealogy'

function node(partial: Partial<GenealogyNode> & Pick<GenealogyNode, 'id'>): GenealogyNode {
  return {
    fullName: 'Test',
    birthYear: null,
    birthLocation: '',
    birthCoords: { lat: 0, lng: 0 },
    deathYear: null,
    deathLocation: null,
    deathCoords: null,
    parentId: null,
    spouseId: null,
    ...partial,
  }
}

describe('isGenealogyNodeInteractiveAtPlayhead (map circles)', () => {
  it('is interactive when birth is on or before playhead', () => {
    expect(isGenealogyNodeInteractiveAtPlayhead(1800, node({ id: '1', birthYear: 1800 }))).toBe(true)
    expect(isGenealogyNodeInteractiveAtPlayhead(1801, node({ id: '1', birthYear: 1800 }))).toBe(true)
  })

  it('is not interactive when birth is after playhead', () => {
    expect(isGenealogyNodeInteractiveAtPlayhead(1799, node({ id: '1', birthYear: 1800 }))).toBe(false)
  })

  it('is not interactive when birth year is unknown', () => {
    expect(isGenealogyNodeInteractiveAtPlayhead(1700, node({ id: '1', birthYear: null }))).toBe(false)
    expect(isGenealogyNodeInteractiveAtPlayhead(2100, node({ id: '1', birthYear: null }))).toBe(false)
  })
})

describe('isGenealogyTreeCardInteractive', () => {
  it('is not interactive when birth year is unknown', () => {
    expect(isGenealogyTreeCardInteractive(2000, node({ id: '1', birthYear: null }))).toBe(false)
  })

  it('follows timeline playhead when birth is known', () => {
    expect(isGenealogyTreeCardInteractive(1800, node({ id: '1', birthYear: 1800 }))).toBe(true)
    expect(isGenealogyTreeCardInteractive(1799, node({ id: '1', birthYear: 1800 }))).toBe(false)
  })
})
