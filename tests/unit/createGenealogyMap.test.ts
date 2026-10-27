import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGenealogyMap } from '@genealogy/map/createGenealogyMap'
import { publicGenealogyNodes } from '@genealogy/lib/atlasFormat'
import { getHistoricalCountyKey } from '@genealogy/lib/matchHistoricalCounty'
import { genealogyData } from '../../src/data/genealogy'
import type { HistoricalCountyFeatureCollection } from '../../src/types/historicalCounties'

const nodes = publicGenealogyNodes(genealogyData)

function mount() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.append(svg)
  const callbacks = { onNodeEnter: vi.fn(), onNodeMove: vi.fn(), onNodeLeave: vi.fn(), onNodeClick: vi.fn() }
  const handle = createGenealogyMap(svg, nodes, 900, 500, callbacks)
  return { svg, handle, callbacks }
}

/** One small square county in Virginia, valid for every year. */
const counties = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { state_abbr: 'va', name: 'SURRY', startYear: 1652, endYear: Number.NaN },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.0, 37.0],
            [-76.8, 37.0],
            [-76.8, 37.2],
            [-77.0, 37.2],
            [-77.0, 37.0],
          ],
        ],
      },
    },
  ],
} as unknown as HistoricalCountyFeatureCollection

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createGenealogyMap', () => {
  it('draws the atlas layers for the public family', () => {
    const { svg } = mount()
    const q = (sel: string) => svg.querySelectorAll(sel).length
    expect(q('g[data-role="states"] path')).toBeGreaterThanOrEqual(14)
    expect(q('g[data-role="connectors"] path')).toBe(nodes.length - 1)
    expect(q('g[data-role="nodes"] circle')).toBe(nodes.length)
    // Everyone with a recorded place of death gets a dotted removal and a ✕.
    const withDeath = nodes.filter((n) => n.deathCoords).length
    expect(q('g[data-role="removals"] path')).toBe(withDeath)
    expect(q('g[data-role="deaths"] g')).toBe(withDeath)
    expect(q('g[data-role="state-labels"] text')).toBeGreaterThan(0)
    expect(q('g[data-role="place-labels"] text')).toBeGreaterThan(0)
  })

  it('uses non-scaling strokes so lines keep their weight when zoomed', () => {
    const { svg } = mount()
    for (const role of ['states', 'connectors', 'removals']) {
      expect(svg.querySelector(`g[data-role="${role}"] path`)?.getAttribute('vector-effect')).toBe(
        'non-scaling-stroke',
      )
    }
  })

  it('accents the active place label', () => {
    const { svg, handle } = mount()
    handle.setActivePlace('Surry County, VA')
    const g = svg.querySelector('g[data-place="Surry County, VA"]')
    expect(g?.getAttribute('data-active')).toBe('true')
  })

  it('draws county outlines unfilled and fills only the highlighted county', () => {
    const { svg, handle } = mount()
    handle.setHistoricalCounties(counties)
    handle.setPlayheadYear(1800)
    const path = () => svg.querySelector('g[data-role="historical-counties"] path')!
    expect(path().getAttribute('fill')).toBe('none')
    expect(path().getAttribute('stroke')).toBe('var(--map-county)')

    handle.setHighlightedCounties(new Set([getHistoricalCountyKey(counties.features[0]!)]))
    expect(path().getAttribute('data-highlighted')).toBe('true')
    expect(path().getAttribute('fill')).toBe('var(--chart-3)')
    expect(path().getAttribute('fill-opacity')).toBe('0.45')
  })

  it('moves the highlight and the playhead without touching unaffected counties', () => {
    const square = (x: number) => [
      [
        [x, 37.0],
        [x + 0.2, 37.0],
        [x + 0.2, 37.2],
        [x, 37.2],
        [x, 37.0],
      ],
    ]
    const county = (id: string, x: number, startYear: number, endYear: number) => ({
      type: 'Feature',
      properties: { ID: id, VERSION: 1, state_abbr: 'va', startYear, endYear },
      geometry: { type: 'Polygon', coordinates: square(x) },
    })
    const fc = {
      type: 'FeatureCollection',
      features: [
        county('a', -78.0, 1700, Number.NaN),
        county('b', -77.6, 1700, Number.NaN),
        county('c', -77.2, 1800, Number.NaN),
      ],
    } as unknown as HistoricalCountyFeatureCollection
    const { svg, handle } = mount()
    handle.setHistoricalCounties(fc)
    handle.setPlayheadYear(1750)
    // D3 keeps each path's feature on `__data__`.
    const paths = [...svg.querySelectorAll<SVGPathElement>('g[data-role="historical-counties"] path')]
    const el = (id: string) =>
      paths.find(
        (p) => (p as unknown as { __data__: { properties: { ID: string } } }).__data__.properties.ID === id,
      )!
    const [a, b, c] = [el('a'), el('b'), el('c')]

    // c starts in 1800, so it is hidden at 1750 and shown once the playhead passes it.
    expect(c.style.display).toBe('none')
    handle.setPlayheadYear(1820)
    expect(c.style.display).toBe('')

    const writesToC = vi.spyOn(c, 'setAttribute')
    handle.setHighlightedCounties(new Set(['a:1']))
    expect(a.getAttribute('data-highlighted')).toBe('true')
    handle.setHighlightedCounties(new Set(['b:1']))
    expect(a.getAttribute('data-highlighted')).toBe('false')
    expect(a.getAttribute('fill')).toBe('none')
    expect(b.getAttribute('data-highlighted')).toBe('true')
    // The highlighted county is drawn last, on top of its neighbours.
    expect(b.parentNode?.lastChild).toBe(b)
    // c was never highlighted, so the highlight moving never rewrote it.
    expect(writesToC).not.toHaveBeenCalled()
  })

  it('selects and dims nodes, and greys out people not yet born', () => {
    const { svg, handle } = mount()
    handle.setSelected('william-rives')
    const circle = (id: string) => svg.querySelector(`circle[data-node-id="${id}"]`)!
    expect(circle('william-rives').getAttribute('data-selected')).toBe('true')
    expect(circle('edmond-reaves').getAttribute('data-selected')).toBe('false')
    handle.setTimelineInteractionContext(1760)
    expect(circle('edmond-reaves').getAttribute('data-timeline-inactive')).toBe('true')
    expect(circle('william-rives').getAttribute('data-timeline-inactive')).toBe('false')
  })

  it('tears down cleanly', () => {
    const { svg, handle } = mount()
    handle.destroy()
    expect(svg.childElementCount).toBe(0)
  })
})
