import * as d3 from 'd3'
import { describe, expect, it } from 'vitest'
import type { Feature, Geometry } from 'geojson'
import {
  drawGenealogyAnnotations,
  drawGenealogyRemovals,
  layoutPlaceLabels,
} from '@genealogy/map/genealogyMapAnnotations'
import type { GenealogyNode } from '../../src/types/genealogy'

/** Identity-ish projection: lng/lat straight to px, so positions are predictable. */
const project = (lng: number, lat: number): [number, number] => [lng * 10, lat * 10]

function node(partial: Partial<GenealogyNode> & Pick<GenealogyNode, 'id'>): GenealogyNode {
  return {
    fullName: partial.id,
    birthYear: 1800,
    birthLocation: 'Surry County, VA',
    birthCoords: { lat: 10, lng: 10 },
    deathYear: null,
    deathLocation: null,
    deathCoords: null,
    parentId: null,
    spouseId: null,
    ...partial,
  }
}

function svgRoot() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.append(svg)
  return d3.select(svg).append('g') as d3.Selection<SVGGElement, unknown, null, undefined>
}

const nodes: GenealogyNode[] = [
  node({
    id: 'a',
    birthLocation: 'Surry County, VA',
    birthCoords: { lat: 10, lng: 90 },
    deathYear: 1850,
    deathLocation: 'Iredell County, NC',
    deathCoords: { lat: 20, lng: 60 },
  }),
  // Same birthplace as `a`: one label, not two.
  node({ id: 'b', parentId: 'a', birthLocation: 'Surry County, VA', birthCoords: { lat: 10, lng: 90 } }),
  node({ id: 'c', parentId: 'b', birthLocation: 'Tippah County, MS', birthCoords: { lat: 30, lng: 5 } }),
]

describe('layoutPlaceLabels', () => {
  it('puts labels right of the point, or left of it in the eastern third', () => {
    const [west, east] = layoutPlaceLabels(
      [
        { key: 'w', text: 'West', x: 100, y: 50 },
        { key: 'e', text: 'East', x: 900, y: 50 },
      ],
      1000,
    )
    expect(west).toMatchObject({ key: 'w', anchor: 'start' })
    expect(west.dx).toBeGreaterThan(0)
    expect(east).toMatchObject({ key: 'e', anchor: 'end' })
    expect(east.dx).toBeLessThan(0)
  })

  it('steps a clashing label onto another line', () => {
    const placed = layoutPlaceLabels(
      [
        { key: 'one', text: 'Bute Co., N.C.', x: 100, y: 100 },
        { key: 'two', text: 'Franklin Co., N.C.', x: 102, y: 102 },
      ],
      1000,
    )
    const [first, second] = placed
    expect(first.dy).not.toBe(second.dy)
  })
})

describe('drawGenealogyRemovals', () => {
  it('draws one dotted birth→death curve per person with a place of death', () => {
    const root = svgRoot()
    drawGenealogyRemovals(root, nodes, project)
    const paths = root.selectAll('g[data-role="removals"] path')
    expect(paths.size()).toBe(1)
    expect(paths.attr('data-node-id')).toBe('a')
    expect(paths.attr('stroke-dasharray')).toBe('1 5')
    expect(paths.attr('d')).toMatch(/^M 900 100 Q /)
  })

  it('skips people whose places do not project', () => {
    const root = svgRoot()
    drawGenealogyRemovals(root, nodes, () => null)
    expect(root.selectAll('g[data-role="removals"] path').size()).toBe(0)
  })
})

describe('drawGenealogyAnnotations', () => {
  const states = [
    { type: 'Feature', id: '51', properties: {}, geometry: null },
    { type: 'Feature', id: '99', properties: {}, geometry: null }, // no name → no label
  ] as unknown as Feature<Geometry>[]

  function draw(width = 1000) {
    const root = svgRoot()
    const handle = drawGenealogyAnnotations({
      root,
      nodes,
      project,
      states,
      centroid: () => [400, 300],
      width,
    })
    return { root, handle }
  }

  it('marks each place of death, names known states, and labels each distinct place once', () => {
    const { root } = draw()
    expect(root.selectAll('g[data-role="deaths"] g').size()).toBe(1)
    const stateText = root.selectAll<SVGTextElement, unknown>('g[data-role="state-labels"] text')
    expect(stateText.size()).toBe(1)
    expect(stateText.text()).toBe('VIRGINIA')
    const places = root
      .selectAll<SVGTextElement, unknown>('g[data-role="place-labels"] text')
      .nodes()
      .map((t) => t.textContent)
    expect(places.sort()).toEqual(['Iredell Co., N.C.', 'Surry Co., Va.', 'Tippah Co., Miss.'])
  })

  it('keeps glyphs and labels at screen size as the map zooms', () => {
    const { root, handle } = draw()
    handle.setZoom(4)
    const t = root.select('g[data-role="deaths"] g').attr('transform')
    expect(t).toBe('translate(600,200) scale(0.25)')
    expect(root.select('g[data-role="place-labels"] g').attr('transform')).toMatch(/scale\(0\.25\)$/)
  })

  it('accents the active place and clears it again', () => {
    const { root, handle } = draw()
    handle.setActivePlace('Tippah County, MS')
    const active = root.select('g[data-place="Tippah County, MS"]')
    expect(active.attr('data-active')).toBe('true')
    expect(active.select('text').attr('fill')).toBe('var(--atlas-accent-text)')
    expect(active.select('text').attr('font-weight')).toBe('600')
    handle.setActivePlace(null)
    expect(active.attr('data-active')).toBe('false')
    expect(active.select('text').attr('fill')).toBe('var(--foreground)')
  })

  it('on a narrow map shows only the active place until zoomed in', () => {
    const { root, handle } = draw(300)
    const shown = () =>
      root
        .selectAll<SVGGElement, unknown>('g[data-role="place-labels"] g')
        .nodes()
        .filter((g) => g.getAttribute('display') !== 'none').length
    handle.setActivePlace('Surry County, VA')
    expect(shown()).toBe(1)
    expect(root.select('g[data-role="state-labels"] g').attr('display')).toBe('none')
    handle.setZoom(3)
    expect(shown()).toBe(3)
    expect(root.select('g[data-role="state-labels"] g').attr('display')).toBeNull()
  })
})
