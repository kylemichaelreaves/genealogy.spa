import { describe, expect, it } from 'vitest'
import {
  atlasRulerPct,
  atlasRulerTicks,
  formatAtlasPlace,
  formatLifespan,
  generationNumbers,
  publicGenealogyNodes,
  toRoman,
} from '../../src/components/genealogy/lib/atlasFormat'
import { genealogyData } from '../../src/data/genealogy'

describe('formatAtlasPlace', () => {
  it('abbreviates county and state the way a period atlas does', () => {
    expect(formatAtlasPlace('Surry County, VA')).toBe('Surry Co., Va.')
    expect(formatAtlasPlace('Bute County, NC')).toBe('Bute Co., N.C.')
    expect(formatAtlasPlace('Memphis, Shelby County, TN')).toBe('Memphis, Shelby Co., Tenn.')
  })

  it('handles a bare state and passes unknown parts through', () => {
    expect(formatAtlasPlace('MS')).toBe('Miss.')
    expect(formatAtlasPlace('Somewhere, XX')).toBe('Somewhere, XX')
  })
})

describe('toRoman', () => {
  it('covers the generations on the page', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9, 14].map(toRoman)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'IX',
      'XIV',
    ])
  })
})

describe('generationNumbers', () => {
  it('counts generations down the parent chain', () => {
    const g = generationNumbers(genealogyData)
    expect(g.get('william-rives')).toBe(1)
    expect(g.get('ransom-reaves')).toBe(3)
    expect(g.get('john-franklin')).toBe(7)
  })
})

describe('formatLifespan', () => {
  it('shows a range, or a birth year alone', () => {
    const byId = new Map(genealogyData.map((n) => [n.id, n]))
    expect(formatLifespan(byId.get('william-rives')!)).toBe('1748–1829')
    expect(formatLifespan(byId.get('lee-reaves')!)).toBe('b. 1898')
    expect(formatLifespan(byId.get('john-franklin')!)).toBe('dates unknown')
  })
})

describe('atlasRulerTicks', () => {
  it('rounds out to whole decades and marks every fifty years', () => {
    const { start, end, ticks } = atlasRulerTicks(1748, 1922)
    expect(start).toBe(1740)
    expect(end).toBe(1930)
    expect(ticks).toHaveLength(20)
    expect(ticks.filter((t) => t.major).map((t) => t.year)).toEqual([1750, 1800, 1850, 1900])
    expect(ticks[0]!.leftPct).toBe(0)
    expect(ticks.at(-1)!.leftPct).toBe(100)
    expect(atlasRulerPct(1835, start, end)).toBe(50)
  })
})

describe('publicGenealogyNodes', () => {
  it('leaves withheld relatives off the page', () => {
    const ids = publicGenealogyNodes(genealogyData).map((n) => n.id)
    expect(ids).not.toContain('john-franklin')
    expect(ids).toHaveLength(genealogyData.length - 1)
  })
})
