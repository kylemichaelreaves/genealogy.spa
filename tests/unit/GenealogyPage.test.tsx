import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GenealogyPage from '@genealogy/GenealogyPage'

/**
 * jsdom has no layout, so stand in for ResizeObserver with a fixed 900px box.
 * It reports after useElementSize's own clientWidth microtask (which reads 0
 * in jsdom), so the map gets a real width and builds its D3 scene.
 */
class FixedSizeObserver {
  private readonly cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
  }
  observe(target: Element) {
    setTimeout(() => {
      const contentRect = { width: 900, height: 500 } as DOMRectReadOnly
      this.cb([{ target, contentRect } as ResizeObserverEntry], this as unknown as ResizeObserver)
    })
  }
  unobserve() {}
  disconnect() {}
}

let dispose: (() => void) | undefined
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FixedSizeObserver)
  // County TopoJSON is out of scope here: answer every request with a 404 so
  // the map renders without historical counties.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('not found', { status: 404, statusText: 'Not Found' })),
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  dispose = render(
    () => (
      <QueryClientProvider client={client}>
        <GenealogyPage />
      </QueryClientProvider>
    ),
    host,
  )
  // Let the size observer fire and the map build.
  await new Promise((r) => setTimeout(r, 20))
  const q = <T extends Element = HTMLElement>(sel: string) => host.querySelector<T>(sel)
  return { host, q }
}

describe('GenealogyPage (atlas plate)', () => {
  it('renders the plate heading, with years and counts taken from the data', async () => {
    const { host, q } = await mount()
    expect(q('h1')?.textContent).toBe('From Surry County to Mississippi, 1748–1922')
    expect(host.textContent).toContain('Plate I · The Reaves line')
    expect(host.textContent).toContain('Seven generations · six states')
    expect(q('[data-testid="theme-toggle"]')).not.toBeNull()
  })

  it('lists the public family in the register and notes the withheld generation', async () => {
    const { host, q } = await mount()
    expect(host.querySelectorAll('[data-testid^="genealogy-person-"]')).toHaveLength(6)
    expect(q('[data-testid="genealogy-person-john-franklin"]')).toBeNull()
    expect(q('[data-testid="genealogy-withheld"]')?.textContent).toContain('VII')
  })

  it('frames the map with its key and builds the D3 scene once it has a width', async () => {
    const { q } = await mount()
    expect(q('[data-testid="genealogy-map-legend"]')?.textContent).toContain('Explanation')
    expect(q('[data-testid="genealogy-map-svg"] g[data-role="place-labels"]')).not.toBeNull()
    // The first event is William Rives's birth, so his birthplace is the active label.
    expect(q('g[data-place="Surry County, VA"]')?.getAttribute('data-active')).toBe('true')
  })

  it('derives the map height from its width outside a desktop-sized window', async () => {
    const { q } = await mount()
    // jsdom has no matchMedia, so the layout is the stacked one: 900 × 0.55.
    expect(q('[data-testid="genealogy-map-svg"]')?.getAttribute('height')).toBe('495')
  })

  it('fills the box the layout gives the map when the plate fits the window', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { q } = await mount()
    // The observer reports a 900 × 500 box; fitted, the map takes all of it.
    const svg = q('[data-testid="genealogy-map-svg"]')
    expect(svg?.getAttribute('width')).toBe('900')
    expect(svg?.getAttribute('height')).toBe('500')
  })

  it('glosses "removal" in the key on hover, focus and tap, and Escape closes it', async () => {
    const { q } = await mount()
    const term = q<HTMLButtonElement>('[data-testid="genealogy-legend-removal"]')!
    const gloss = q('[data-testid="genealogy-legend-removal-gloss"]')!
    expect(gloss.getAttribute('role')).toBe('tooltip')
    expect(term.getAttribute('aria-describedby')).toBe(gloss.id)
    expect(gloss.textContent).toContain('removed to Mississippi')
    expect(gloss.hidden).toBe(true)

    term.dispatchEvent(new MouseEvent('mouseenter'))
    expect(gloss.hidden).toBe(false)
    term.dispatchEvent(new MouseEvent('mouseleave'))
    expect(gloss.hidden).toBe(true)

    term.focus()
    expect(gloss.hidden).toBe(false)
    term.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(gloss.hidden).toBe(true)
    term.blur()

    term.click()
    expect(gloss.hidden).toBe(false)
  })

  it('moves the timeline, the active register row and the active map label together', async () => {
    const { q } = await mount()
    const active = () => q('[data-testid="genealogy-register"] [data-active="true"]')?.dataset.testid
    expect(active()).toBe('genealogy-person-william-rives')
    q<HTMLButtonElement>('[data-testid="genealogy-timeline-next"]')!.click()
    expect(q('[data-testid="genealogy-timeline-year"]')?.textContent).toBe('1776')
    expect(active()).toBe('genealogy-person-edmond-reaves')
    expect(q('g[data-place="Bute County, NC"]')?.getAttribute('data-active')).toBe('true')
  })

  it('pinning a person in the register jumps the timeline to their birth', async () => {
    const { q } = await mount()
    q<HTMLButtonElement>('[data-testid="genealogy-person-john-sr"]')!.click()
    expect(q('[data-testid="genealogy-timeline-year"]')?.textContent).toBe('1820')
    expect(q('[data-testid="genealogy-person-john-sr"]')?.dataset.active).toBe('true')
  })

  it('keeps the county paths across timeline steps instead of rebuilding them', async () => {
    // One square county per requested state, valid for every year. The response
    // waits until after the map is built, as a real network would: arriving
    // earlier skips the code path that used to rebuild the paths on every step.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        await new Promise((r) => setTimeout(r, 40))
        const abbr = /states\/([a-z]{2})\.topojson$/.exec(url)![1]
        const topology = {
          type: 'Topology',
          arcs: [
            [
              [-80, 36],
              [-79, 36],
              [-79, 37],
              [-80, 37],
              [-80, 36],
            ],
          ],
          objects: {
            [abbr]: {
              type: 'GeometryCollection',
              geometries: [
                {
                  type: 'Polygon',
                  arcs: [[0]],
                  properties: {
                    ID: `${abbr}_1`,
                    VERSION: 1,
                    NAME: 'TEST',
                    FULL_NAME: 'Test County',
                    state_abbr: abbr,
                    START_DATE: '1600-01-01',
                    END_DATE: '',
                  },
                },
              ],
            },
          },
        }
        return new Response(JSON.stringify(topology), { status: 200 })
      }),
    )
    const { q } = await mount()
    await new Promise((r) => setTimeout(r, 60))
    const first = q('g[data-role="historical-counties"] path')
    expect(first).not.toBeNull()

    q<HTMLButtonElement>('[data-testid="genealogy-timeline-next"]')!.click()
    q<HTMLButtonElement>('[data-testid="genealogy-timeline-next"]')!.click()

    // A rebuild would detach every path and create new ones.
    expect(first!.isConnected).toBe(true)
    expect(q('g[data-role="historical-counties"] path')).toBe(first)
  })
})
