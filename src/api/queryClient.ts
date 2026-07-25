import { QueryCache, QueryClient } from '@tanstack/solid-query'

/**
 * The source app's client special-cased axios errors (401 / cancellation) and
 * ran an API-error extractor. Neither applies here: the only network call is an
 * unauthenticated `fetch` of immutable TopoJSON from a public bucket.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      if (query.meta?.skipGlobalError) return
      console.error('[query]', error instanceof Error ? error.message : error)
    },
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
})
