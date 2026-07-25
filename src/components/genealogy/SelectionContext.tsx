import type { JSX } from 'solid-js'
import { createContext, createSignal, useContext } from 'solid-js'
import type { GenealogyNode, SelectionState } from '../../types/genealogy'

const SelectionContext = createContext<SelectionState>()

export function SelectionProvider(props: { children: JSX.Element }) {
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [pinnedId, setPinnedId] = createSignal<string | null>(null)
  const [playheadYear, setPlayheadYear] = createSignal(1748)

  const timelinePinSyncRef: { current: ((node: GenealogyNode) => void) | null } = { current: null }

  const value: SelectionState = {
    selectedId,
    setSelectedId,
    pinnedId,
    setPinnedId,
    playheadYear,
    setPlayheadYear,
    registerTimelinePinSync(handler) {
      timelinePinSyncRef.current = handler
    },
    runTimelinePinSync(node) {
      timelinePinSyncRef.current?.(node)
    },
  }

  return <SelectionContext.Provider value={value}>{props.children}</SelectionContext.Provider>
}

export function useSelection(): SelectionState {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within a SelectionProvider')
  return ctx
}
