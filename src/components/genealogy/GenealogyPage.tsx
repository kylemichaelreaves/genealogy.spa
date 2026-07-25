import type { JSX } from 'solid-js'
import { useElementSize } from '@composables/useElementSize'
import { genealogyData } from '../../data/genealogy'
import FamilyTree from '@genealogy/tree/FamilyTree'
import GenealogyMapPanel from '@genealogy/map/GenealogyMapPanel'
import { SelectionProvider } from './SelectionContext'

const FALLBACK_TREE_HEIGHT_PX = 400
const MIN_TREE_HEIGHT_PX = 320

export default function GenealogyPage(): JSX.Element {
  const [mapDims, attachMapPanel] = useElementSize()
  const treeHeight = () => {
    const h = mapDims().h
    if (h <= 0) return FALLBACK_TREE_HEIGHT_PX
    return Math.max(MIN_TREE_HEIGHT_PX, h)
  }

  return (
    <SelectionProvider>
      <section class="w-full" data-testid="genealogy-page">
        <header class="mb-4">
          <h1 class="text-2xl font-bold text-foreground">Genealogy</h1>
          <p class="text-sm text-muted-foreground">
            Reaves family lineage from William Rives (b. 1748, Surry County VA) onward. Hover any person to
            highlight their location on the map.
          </p>
        </header>

        <div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
          <div ref={(el) => attachMapPanel(el)} class="min-w-0 w-full">
            <GenealogyMapPanel nodes={genealogyData} />
          </div>
          <div class="min-w-0 w-full" style={{ height: `${treeHeight()}px` }}>
            <FamilyTree nodes={genealogyData} />
          </div>
        </div>
      </section>
    </SelectionProvider>
  )
}
