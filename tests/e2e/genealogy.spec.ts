import { test, expect } from './fixtures/fixtures'
import { GENEALOGY_NODE_IDS, WITHHELD_NODE_IDS } from './pages/GenealogyPage'

// The source repo also asserted that the app sidebar exposed a Genealogy
// section and that navigating there landed on /budget-visualizer/genealogy.
// Neither exists standalone, so those assertions are gone.
test.describe('Genealogy page', () => {
  test('renders the plate heading, map, register and timeline', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    await expect(genealogyPage.heading).toBeVisible()
    await expect(genealogyPage.mapPanel).toBeVisible()
    await expect(genealogyPage.register).toBeVisible()
    await expect(genealogyPage.timeline).toBeVisible()
  })

  test('register lists one row per public ancestor', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    await expect(genealogyPage.personCards).toHaveCount(GENEALOGY_NODE_IDS.length)
    for (const id of GENEALOGY_NODE_IDS) {
      await expect(genealogyPage.personCard(id)).toBeVisible()
    }
  })

  test('withheld relatives are left off the register and the map', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    for (const id of WITHHELD_NODE_IDS) {
      await expect(genealogyPage.personCard(id)).toHaveCount(0)
      await expect(genealogyPage.mapNode(id)).toHaveCount(0)
    }
    await expect(genealogyPage.withheldNote).toContainText('withheld')
  })

  test('map renders southern-state shapes, connectors, and one circle per ancestor', async ({
    genealogyPage,
  }) => {
    await genealogyPage.goto()
    await expect(genealogyPage.mapSvg).toBeVisible()
    // Every public ancestor but the first has a parent on the page, so one connector each.
    const connectorCount = GENEALOGY_NODE_IDS.length - 1
    await expect(genealogyPage.connectorPaths).toHaveCount(connectorCount)
    await expect(genealogyPage.mapCircles).toHaveCount(GENEALOGY_NODE_IDS.length)
    // At least the 14 southern-state FIPS filter should yield a meaningful count;
    // topojson sometimes splits disjoint geometries so allow >= 14.
    await expect.poll(async () => await genealogyPage.stateShapes.count()).toBeGreaterThanOrEqual(14)
  })

  test('historical county TopoJSON loads from S3 for states used in the tree', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    await expect
      .poll(async () => await genealogyPage.historicalCountyPaths.count(), { timeout: 15_000 })
      .toBeGreaterThan(0)
  })

  test('hovering a register row selects the matching map node', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    const targetId = 'william-rives'

    // Nothing selected initially — every circle reports data-selected=false.
    await expect(genealogyPage.selectedMapNode).toHaveCount(0)

    await genealogyPage.personCard(targetId).hover()
    await expect(genealogyPage.selectedMapNode).toHaveCount(1)
    await expect(genealogyPage.mapNode(targetId)).toHaveAttribute('data-selected', 'true')
    // The register carries the details inline, so no map tooltip appears.
    await expect(genealogyPage.mapTooltip).toBeHidden()
  })

  test('moving off the row clears selection', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    await genealogyPage.personCard('william-rives').hover()
    await expect(genealogyPage.selectedMapNode).toHaveCount(1)

    await genealogyPage.heading.hover()
    await expect(genealogyPage.selectedMapNode).toHaveCount(0)
  })

  test('timeline next advances the year and the active register row follows', async ({ genealogyPage }) => {
    await genealogyPage.goto()
    await expect(genealogyPage.timelineAxis).toBeVisible()
    await expect(genealogyPage.activeRegisterRow).toHaveAttribute(
      'data-testid',
      'genealogy-person-william-rives',
    )
    const y0 = await genealogyPage.timelineYear.textContent()
    await genealogyPage.timelineNext.click()
    const y1 = await genealogyPage.timelineYear.textContent()
    expect(y0).toBeTruthy()
    expect(y1).not.toBe(y0)
    await expect(genealogyPage.activeRegisterRow).toHaveAttribute(
      'data-testid',
      'genealogy-person-edmond-reaves',
    )
  })

  test('theme toggle switches between light and dark and remembers the choice', async ({ genealogyPage }) => {
    await genealogyPage.page.emulateMedia({ colorScheme: 'light' })
    await genealogyPage.goto()
    const html = genealogyPage.page.locator('html')
    await expect(html).not.toHaveClass(/\bdark\b/)

    await genealogyPage.themeToggle.click()
    await expect(html).toHaveClass(/\bdark\b/)
    await expect(genealogyPage.themeToggle).toHaveAccessibleName('Switch to light theme')

    await genealogyPage.page.reload()
    await expect(html).toHaveClass(/\bdark\b/)
  })
})
