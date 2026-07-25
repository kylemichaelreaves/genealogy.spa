import { test as base, expect } from '@playwright/test'
import { GenealogyPage } from '../pages/GenealogyPage'

/**
 * The source repo's fixture bundle carried an authenticated-session fixture and
 * a sidebar POM, because the page lived behind login inside the app shell.
 * Standalone there is no auth and no shell, so all that remains is the page
 * object itself.
 */
export const test = base.extend<{ genealogyPage: GenealogyPage }>({
  genealogyPage: async ({ page }, use) => {
    await use(new GenealogyPage(page))
  },
})

export { expect }
