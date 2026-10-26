import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import AtlasRegister from '@genealogy/AtlasRegister'
import { SelectionProvider, useSelection } from '@genealogy/SelectionContext'
import { generationNumbers, publicGenealogyNodes } from '@genealogy/lib/atlasFormat'
import { genealogyData } from '../../src/data/genealogy'

const nodes = publicGenealogyNodes(genealogyData)
const generations = generationNumbers(genealogyData)

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
})

function mount(activeId: string | null, withheld: number[] = [7]) {
  const host = document.createElement('div')
  document.body.append(host)
  let selection!: ReturnType<typeof useSelection>
  function Probe() {
    selection = useSelection()
    return null
  }
  dispose = render(
    () => (
      <SelectionProvider>
        <Probe />
        <AtlasRegister
          nodes={nodes}
          generations={generations}
          activeId={activeId}
          withheldGenerations={withheld}
        />
      </SelectionProvider>
    ),
    host,
  )
  const row = (id: string) => host.querySelector<HTMLButtonElement>(`[data-testid="genealogy-person-${id}"]`)!
  return { host, row, selection: () => selection }
}

describe('AtlasRegister', () => {
  it('numbers each person by generation and lists their places in atlas style', () => {
    const { row } = mount(null)
    expect(row('william-rives').textContent).toContain('I')
    expect(row('william-rives').textContent).toContain('William Rives 1748–1829')
    expect(row('william-rives').textContent).toContain('b. Surry Co., Va. · d. Iredell Co., N.C.')
    expect(row('ransom-reaves').textContent).toMatch(/^III/)
    // No place of death: only the birthplace.
    expect(row('lee-reaves').textContent).toContain('b. 1898')
    expect(row('lee-reaves').textContent).not.toContain('· d.')
  })

  it('marks the active person', () => {
    const { row } = mount('ransom-reaves')
    expect(row('ransom-reaves').dataset.active).toBe('true')
    expect(row('ransom-reaves').getAttribute('aria-current')).toBe('true')
    expect(row('william-rives').dataset.active).toBe('false')
  })

  it('selects on hover or focus, clears on leave or blur, and pins on click', () => {
    const { row, selection } = mount(null)
    const r = row('edmond-reaves')
    r.dispatchEvent(new MouseEvent('mouseenter'))
    expect(selection().selectedId()).toBe('edmond-reaves')
    r.dispatchEvent(new MouseEvent('mouseleave'))
    expect(selection().selectedId()).toBeNull()
    r.dispatchEvent(new FocusEvent('focus'))
    expect(selection().selectedId()).toBe('edmond-reaves')
    r.dispatchEvent(new FocusEvent('blur'))
    expect(selection().selectedId()).toBeNull()

    r.click()
    expect(selection().pinnedId()).toBe('edmond-reaves')
    r.click()
    expect(selection().pinnedId()).toBeNull()
  })

  it('notes withheld generations, and stays quiet when there are none', () => {
    const one = mount(null, [7])
    expect(one.host.querySelector('[data-testid="genealogy-withheld"]')?.textContent).toContain(
      'VIIA later generation, withheld while living relatives may be named.',
    )
    dispose?.()
    const two = mount(null, [7, 8])
    expect(two.host.querySelector('[data-testid="genealogy-withheld"]')?.textContent).toContain(
      'VII, VIIILater generations',
    )
    dispose?.()
    const none = mount(null, [])
    expect(none.host.querySelector('[data-testid="genealogy-withheld"]')).toBeNull()
  })
})
