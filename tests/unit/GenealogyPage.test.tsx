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
})
