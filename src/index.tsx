/* @refresh reload */
import { QueryClientProvider } from '@tanstack/solid-query'
import { render } from 'solid-js/web'
import { queryClient } from '@api/queryClient'
import GenealogyPage from '@genealogy/GenealogyPage'
import './index.css'

const root = document.getElementById('root')

/**
 * In the source app this page rendered inside the BudgetVisualizer shell, which
 * supplied the background/foreground tokens and page padding. Standalone, that
 * wrapper lives here.
 */
render(
  () => (
    <QueryClientProvider client={queryClient}>
      <main class="bg-background text-foreground min-h-screen px-4 py-6">
        <GenealogyPage />
      </main>
    </QueryClientProvider>
  ),
  root!,
)
