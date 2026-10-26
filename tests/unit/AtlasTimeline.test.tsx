import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AtlasTimeline from '@genealogy/AtlasTimeline'
import type { GenealogyTimelineStep } from '@genealogy/lib/buildGenealogyTimeline'

const steps: GenealogyTimelineStep[] = [
  { year: 1748, kind: 'birth', nodeId: 'w', fullName: 'William Rives', locationLabel: 'Surry County, VA' },
  { year: 1800, kind: 'birth', nodeId: 'r', fullName: 'Ransom Reaves', locationLabel: 'Franklin County, NC' },
  { year: 1829, kind: 'death', nodeId: 'w', fullName: 'William Rives', locationLabel: '' },
]

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
})

function mount(list: GenealogyTimelineStep[] = steps, start = 0) {
  const host = document.createElement('div')
  document.body.append(host)
  const [index, setIndex] = createSignal(start)
  const onPrev = vi.fn(() => setIndex((i) => i - 1))
  const onNext = vi.fn(() => setIndex((i) => i + 1))
  const onSelectIndex = vi.fn((i: number) => setIndex(i))
  dispose = render(
    () => (
      <AtlasTimeline
        steps={() => list}
        stepIndex={index}
        currentStep={() => list[index()] ?? null}
        onPrev={onPrev}
        onNext={onNext}
        onSelectIndex={onSelectIndex}
      />
    ),
    host,
  )
  const q = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
  return { host, q, onPrev, onNext, onSelectIndex }
}

describe('AtlasTimeline', () => {
  it('shows the year and an atlas-style sentence for the current event', () => {
    const { q, host } = mount()
    expect(q('genealogy-timeline-year').textContent).toBe('1748')
    expect(host.textContent).toContain('William Rives born, Surry Co., Va.')
    expect(q('genealogy-timeline-position').textContent).toContain('1 of 3')
  })

  it('disables Previous at the first event and Next at the last', () => {
    const first = mount()
    expect(first.q('genealogy-timeline-prev')).toHaveProperty('disabled', true)
    expect(first.q('genealogy-timeline-next')).toHaveProperty('disabled', false)
    dispose?.()
    const last = mount(steps, 2)
    expect(last.q('genealogy-timeline-next')).toHaveProperty('disabled', true)
    // A death with no recorded place reads without a dangling comma.
    expect(last.host.textContent).toContain('William Rives died ·')
  })

  it('steps forward and jumps to a clicked mark', () => {
    const { q, host, onNext, onSelectIndex } = mount()
    q('genealogy-timeline-next').click()
    expect(onNext).toHaveBeenCalledOnce()
    expect(q('genealogy-timeline-year').textContent).toBe('1800')

    const marks = host.querySelectorAll<HTMLButtonElement>('[data-testid="genealogy-timeline-axis-mark"]')
    expect([...marks].map((m) => m.textContent)).toEqual(['●', '●', '✕'])
    marks[2]!.click()
    expect(onSelectIndex).toHaveBeenCalledWith(2)
    expect(marks[2]!.getAttribute('aria-current')).toBe('step')
    expect(marks[2]!.getAttribute('aria-label')).toBe('William Rives, Died 1829')
  })

  it('lays the ruler out in decades with a label every fifty years', () => {
    const { host } = mount()
    const labels = [...host.querySelectorAll('[data-testid="genealogy-timeline-axis"] span')]
      .map((s) => s.textContent)
      .filter(Boolean)
    expect(labels).toEqual(['1750', '1800'])
  })

  it('says so when there are no dated events', () => {
    const { host } = mount([])
    expect(host.textContent).toContain('No dated births or deaths to show.')
  })
})
