import type { QueryFunctionContext } from '@tanstack/query-core'
import { useQuery } from '@tanstack/solid-query'
import { queryKeys } from '@api/queryKeys'
import { fetchHistoricalCountiesState } from '@api/historicalCounties/fetchHistoricalCountiesState'
import type { HistoricalCountyFeatureCollection } from '../../../types/historicalCounties'

const STALE_FOREVER = Number.POSITIVE_INFINITY

const STATE_ABBR_FROM_KEY = /^[a-z]{2}$/

function statesFromByStatesQueryKey(queryKey: readonly unknown[]): string[] {
  const raw = queryKey[2]
  if (typeof raw !== 'string' || raw.length === 0) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => STATE_ABBR_FROM_KEY.test(s))
}

/**
 * Fetches historical-counties TopoJSON for each given state abbreviation in
 * parallel and returns a single merged GeoJSON FeatureCollection. Server
 * objects are content-immutable (Cache-Control: immutable), so the cache lives
 * for the lifetime of the page.
 *
 * `queryFn` reads state codes from `queryKey` (not the outer closure) so the
 * fetched URL set always matches the key — avoids stale closures with Solid +
 * TanStack when the key changes.
 *
 * Optional `getRefetchIdentity` (e.g. pinned tree node id) is appended to the
 * query key so changing the active person triggers a fresh S3 merge fetch even
 * when the state abbreviation list is unchanged.
 */
export function useHistoricalCountiesForStates(
  getStates: () => readonly string[],
  getRefetchIdentity?: () => string,
) {
  return useQuery(() => {
    const states = [...getStates()].map((s) => s.toLowerCase()).sort()
    const refetchIdentity = getRefetchIdentity?.() ?? ''
    const queryKey = [...queryKeys.historicalCounties.byStates(states), refetchIdentity] as const
    return {
      queryKey,
      queryFn: async (ctx: QueryFunctionContext): Promise<HistoricalCountyFeatureCollection> => {
        const fromKey = statesFromByStatesQueryKey(ctx.queryKey)
        const fcs = await Promise.all(fromKey.map(fetchHistoricalCountiesState))
        return {
          type: 'FeatureCollection' as const,
          features: fcs.flatMap((fc) => fc.features),
        }
      },
      staleTime: STALE_FOREVER,
      gcTime: STALE_FOREVER,
      refetchOnWindowFocus: false,
      enabled: states.length > 0,
    }
  })
}
