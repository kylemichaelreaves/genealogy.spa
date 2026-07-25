import type { Accessor } from 'solid-js'

export type Coords = { lat: number; lng: number }

export type GenealogyNode = {
  id: string
  fullName: string
  birthYear: number | null
  birthLocation: string
  birthCoords: Coords
  deathYear: number | null
  deathLocation: string | null
  deathCoords: Coords | null
  parentId: string | null
  spouseId: string | null
}

export type SelectionState = {
  selectedId: Accessor<string | null>
  setSelectedId: (id: string | null) => void
  /** Click-pinned person — persists past mouse-leave, drives map zoom + county highlight. */
  pinnedId: Accessor<string | null>
  setPinnedId: (id: string | null) => void
  playheadYear: Accessor<number>
  setPlayheadYear: (year: number) => void
  /**
   * GenealogyMapPanel registers this so map/tree pin clicks can move the timeline
   * playhead to the matching dated event for that person.
   */
  registerTimelinePinSync: (handler: ((node: GenealogyNode) => void) | null) => void
  runTimelinePinSync: (node: GenealogyNode) => void
}
