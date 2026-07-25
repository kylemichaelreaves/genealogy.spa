import type { Locator, Page } from '@playwright/test'

/** Node ids from src/data/genealogy.ts — kept in sync with the seed data. */
export const GENEALOGY_NODE_IDS = [
  'william-rives',
  'edmond-reaves',
  'ransom-reaves',
  'john-sr',
  'john-jr',
  'lee-reaves',
  'john-franklin',
] as const

export type GenealogyNodeId = (typeof GENEALOGY_NODE_IDS)[number]

/**
 * POM for the genealogy two-panel view. Locators prefer `data-testid` for
 * component identity and `data-*` attributes for state assertions — this keeps
 * tests decoupled from visual details (radius, color, CSS class names) so the
 * Phase 2 timeline / pulse-animation work can refactor styling without breaking
 * tests.
 */
export class GenealogyPage {
  readonly page: Page
  readonly root: Locator
  readonly heading: Locator
  readonly mapPanel: Locator
  readonly mapSvg: Locator
  readonly mapStatesGroup: Locator
  readonly mapNodesGroup: Locator
  readonly mapConnectorsGroup: Locator
  readonly mapHistoricalCountiesGroup: Locator
  readonly familyTree: Locator
  readonly timelineAxis: Locator
  readonly timelineOverlay: Locator
  readonly timelineYear: Locator
  readonly timelinePrev: Locator
  readonly timelineNext: Locator
  readonly mapTooltip: Locator
  readonly treeTooltip: Locator

  constructor(page: Page) {
    this.page = page
    this.root = page.getByTestId('genealogy-page')
    this.heading = this.root.getByRole('heading', { name: /^genealogy$/i, level: 1 })
    this.mapPanel = page.getByTestId('genealogy-map-panel')
    this.mapSvg = page.getByTestId('genealogy-map-svg')
    this.mapStatesGroup = this.mapSvg.locator('g[data-role="states"]')
    this.mapNodesGroup = this.mapSvg.locator('g[data-role="nodes"]')
    this.mapConnectorsGroup = this.mapSvg.locator('g[data-role="connectors"]')
    this.mapHistoricalCountiesGroup = this.mapSvg.locator('g[data-role="historical-counties"]')
    this.familyTree = page.getByTestId('genealogy-family-tree')
    this.timelineAxis = page.getByTestId('genealogy-timeline-axis')
    this.timelineOverlay = page.getByTestId('genealogy-timeline-overlay')
    this.timelineYear = page.getByTestId('genealogy-timeline-year')
    this.timelinePrev = page.getByTestId('genealogy-timeline-prev')
    this.timelineNext = page.getByTestId('genealogy-timeline-next')
    this.mapTooltip = page.getByTestId('genealogy-map-tooltip')
    this.treeTooltip = page.getByTestId('genealogy-tree-tooltip')
  }

  async goto() {
    await this.page.goto('/')
  }

  personCard(id: GenealogyNodeId): Locator {
    return this.familyTree.getByTestId(`genealogy-person-${id}`)
  }

  mapNode(id: GenealogyNodeId): Locator {
    return this.mapNodesGroup.locator(`circle[data-node-id="${id}"]`)
  }

  /** Matches only the currently-selected map node (driven by data-selected). */
  get selectedMapNode(): Locator {
    return this.mapNodesGroup.locator('circle[data-selected="true"]')
  }

  get personCards(): Locator {
    return this.familyTree.locator('[data-testid^="genealogy-person-"]')
  }

  get mapCircles(): Locator {
    return this.mapNodesGroup.locator('circle[data-node-id]')
  }

  get stateShapes(): Locator {
    return this.mapStatesGroup.locator('path')
  }

  get connectorPaths(): Locator {
    return this.mapConnectorsGroup.locator('path')
  }

  get historicalCountyPaths(): Locator {
    return this.mapHistoricalCountiesGroup.locator('path')
  }
}
