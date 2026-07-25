import { describe, expect, it } from 'vitest'
import {
  findCountyFeatureMatches,
  findCountyKeysForTimelineStep,
  historicalCountyStatesForGenealogyNode,
  historicalCountyStatesForPinnedLineageContext,
  historicalCountyStatesForTreeAndSelection,
  parseCountyLocation,
} from '@genealogy/lib/matchHistoricalCounty'
import { genealogyData } from '../../src/data/genealogy'
import type { GenealogyNode } from '../../src/types/genealogy'
import type { HistoricalCountyFeature } from '../../src/types/historicalCounties'

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

describe('historicalCountyStatesForGenealogyNode', () => {
  it('parses "<County> County, ST"', () => {
    expect(
      historicalCountyStatesForGenealogyNode(
        node({ id: '1', birthLocation: 'Surry County, VA', deathLocation: null }),
      ),
    ).toEqual(['va'])
  })

  it('parses solo two-letter state', () => {
    expect(historicalCountyStatesForGenealogyNode(node({ id: '1', birthLocation: 'MS' }))).toEqual(['ms'])
  })

  it('parses "City, ST"', () => {
    expect(
      historicalCountyStatesForGenealogyNode(
        node({ id: '1', birthLocation: 'Somewhere, NC', deathLocation: 'Memphis, TN' }),
      ),
    ).toEqual(['nc', 'tn'])
  })

  it('merges birth and death and filters to bucket states', () => {
    expect(
      historicalCountyStatesForGenealogyNode(
        node({
          id: '1',
          birthLocation: 'Franklin County, NC',
          deathLocation: 'Pontotoc County, MS',
        }),
      ),
    ).toEqual(['ms', 'nc'])
  })

  it('drops states not in the historical-counties dataset', () => {
    expect(
      historicalCountyStatesForGenealogyNode(
        node({ id: '1', birthLocation: 'Cook County, IL', deathLocation: null }),
      ),
    ).toEqual([])
  })
})

describe('historicalCountyStatesForTreeAndSelection', () => {
  it('merges union of all nodes (deduped, sorted)', () => {
    const nodes = [
      node({ id: 'a', birthLocation: 'Surry County, VA' }),
      node({ id: 'b', birthLocation: 'Franklin County, NC', deathLocation: 'Pontotoc County, MS' }),
    ]
    expect(historicalCountyStatesForTreeAndSelection(nodes)).toEqual(['ms', 'nc', 'va'])
  })

  it('includes focus id when same as tree (no duplicate work)', () => {
    const n = node({ id: 'x', birthLocation: 'MS' })
    expect(historicalCountyStatesForTreeAndSelection([n], 'x')).toEqual(['ms'])
  })
})

describe('historicalCountyStatesForPinnedLineageContext', () => {
  it('includes descendant states (e.g. GA under Ransom via John Sr.)', () => {
    const st = historicalCountyStatesForPinnedLineageContext('ransom-reaves', genealogyData)
    expect(st).toContain('ga')
    expect(st).toContain('ms')
    expect(st).toContain('nc')
  })
})

describe('findCountyKeysForTimelineStep', () => {
  it('returns no keys when the location is not a "<County> County, ST" string', () => {
    const fc = { type: 'FeatureCollection' as const, features: [] }
    const n = node({ id: '1', birthLocation: 'MS', birthYear: 1900 })
    expect(findCountyKeysForTimelineStep(fc, n, 'birth', 1900).size).toBe(0)
  })
})

/** Minimal AHCB-like feature for county matching tests. */
function ahcbCountyFeature(
  overrides: Pick<HistoricalCountyFeature['properties'], 'NAME' | 'startYear' | 'endYear' | 'VERSION'> &
    Partial<Pick<HistoricalCountyFeature['properties'], 'ID' | 'state_abbr' | 'FIPS'>>,
): HistoricalCountyFeature {
  const p = {
    ID: 'als_calhoun',
    ID_NUM: 1,
    NAME: overrides.NAME,
    FULL_NAME: overrides.NAME,
    STATE_TERR: 'Alabama',
    state_abbr: overrides.state_abbr ?? 'AL',
    FIPS: overrides.FIPS ?? '01015',
    VERSION: overrides.VERSION,
    START_DATE: '',
    END_DATE: '',
    CHANGE: null,
    CITATION: null,
    CNTY_TYPE: 'County',
    CROSS_REF: null,
    END_N: null,
    NAME_START: null,
    START_N: null,
    AREA_SQMI: 1000,
    startYear: overrides.startYear,
    endYear: overrides.endYear,
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: p }
}

describe('findCountyFeatureMatches', () => {
  it('matches Benton County, AL to AHCB BENTON polygons for the pre-rename year range', () => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: [ahcbCountyFeature({ NAME: 'BENTON', startYear: 1850, endYear: 1858, VERSION: 5 })],
    }
    const parsed = parseCountyLocation('Benton County, AL')
    expect(parsed).not.toBeNull()
    expect(findCountyFeatureMatches(fc, parsed!, 1855)).toHaveLength(1)
  })

  it('matches Calhoun County, AL to AHCB CALHOUN polygons after the 1858 rename', () => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: [ahcbCountyFeature({ NAME: 'CALHOUN', startYear: 1858, endYear: 1866, VERSION: 6 })],
    }
    const parsed = parseCountyLocation('Calhoun County, AL')
    expect(parsed).not.toBeNull()
    expect(findCountyFeatureMatches(fc, parsed!, 1860)).toHaveLength(1)
  })
})
