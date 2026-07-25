/**
 * Query keys for the historical-counties layer.
 *
 * Trimmed from the source app's shared `queryKeys` module to just the slice
 * this app uses — the rest keyed budget/transaction queries that did not come
 * across.
 */
export const queryKeys = {
  historicalCounties: {
    all: ['historical-counties'] as const,
    index: ['historical-counties', 'index'] as const,
    state: (abbr: string) => ['historical-counties', 'state', abbr] as const,
    byStates: (abbrs: readonly string[]) =>
      ['historical-counties', 'states', [...abbrs].sort().join(',')] as const,
  },
} as const
