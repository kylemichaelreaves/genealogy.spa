import type { Locator, Page } from '@playwright/test'

/** Public node ids from src/data/genealogy.ts — kept in sync with the seed data. */
export const GENEALOGY_NODE_IDS = [
  'william-rives',
  'edmond-reaves',
  'ransom-reaves',
  'john-sr',
  'john-jr',
  'lee-reaves',
] as const

/** Seed nodes marked `withheld` (possibly living) — must never render. */
export const WITHHELD_NODE_IDS = ['john-franklin'] as const

export type GenealogyNodeId = (typeof GENEALOGY_NODE_IDS)[number]

/**
 * POM for the genealogy atlas plate (map, register, timeline). Locators prefer `data-testid` for
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
  readonly register: Locator
  readonly withheldNote: Locator
  readonly themeToggle: Locator
  readonly timeline: Locator
  readonly timelineAxis: Locator
  readonly timelineYear: Locator
  readonly timelinePrev: Locator
  readonly timelineNext: Locator
  readonly mapTooltip: Locator

  constructor(page: Page) {
    this.page = page
    this.root = page.getByTestId('genealogy-page')
    this.heading = this.root.getByRole('heading', { name: /^From Surry County to Mississippi/, level: 1 })
    this.mapPanel = page.getByTestId('genealogy-map-panel')
    this.mapSvg = page.getByTestId('genealogy-map-svg')
    this.mapStatesGroup = this.mapSvg.locator('g[data-role="states"]')
    this.mapNodesGroup = this.mapSvg.locator('g[data-role="nodes"]')
    this.mapConnectorsGroup = this.mapSvg.locator('g[data-role="connectors"]')
    this.mapHistoricalCountiesGroup = this.mapSvg.locator('g[data-role="historical-counties"]')
    this.register = page.getByTestId('genealogy-register')
    this.withheldNote = page.getByTestId('genealogy-withheld')
    this.themeToggle = page.getByTestId('theme-toggle')
    this.timeline = page.getByTestId('genealogy-timeline')
    this.timelineAxis = page.getByTestId('genealogy-timeline-axis')
    this.timelineYear = page.getByTestId('genealogy-timeline-year')
    this.timelinePrev = page.getByTestId('genealogy-timeline-prev')
    this.timelineNext = page.getByTestId('genealogy-timeline-next')
    this.mapTooltip = page.getByTestId('genealogy-map-tooltip')
  }

  async goto() {
    await this.page.goto('/')
  }

  personCard(id: string): Locator {
    return this.register.getByTestId(`genealogy-person-${id}`)
  }

  mapNode(id: string): Locator {
    return this.mapNodesGroup.locator(`circle[data-node-id="${id}"]`)
  }

  /** Matches only the currently-selected map node (driven by data-selected). */
  get selectedMapNode(): Locator {
    return this.mapNodesGroup.locator('circle[data-selected="true"]')
  }

  get personCards(): Locator {
    return this.register.locator('[data-testid^="genealogy-person-"]')
  }

  get mapCircles(): Locator {
    return this.mapNodesGroup.locator('circle[data-node-id]')
  }

  get stateShapes(): Locator {
    return this.mapStatesGroup.locator('path')
  }

  get activeRegisterRow(): Locator {
    return this.register.locator('[data-active="true"]')
  }

  get connectorPaths(): Locator {
    return this.mapConnectorsGroup.locator('path')
  }

  get historicalCountyPaths(): Locator {
    return this.mapHistoricalCountiesGroup.locator('path')
  }
}
