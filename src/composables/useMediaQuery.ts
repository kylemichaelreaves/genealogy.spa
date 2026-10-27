import { createSignal, onCleanup } from 'solid-js'

/**
 * Whether the plate fills the browser window: a desktop-sized window, wide
 * enough for the side-by-side layout and tall enough for the map to be worth
 * sizing to it. Must match the `fitted` variant in index.css.
 */
export const FITTED_LAYOUT_QUERY = '(min-width: 64rem) and (min-height: 37.5rem)'

/** Tracks a CSS media query. Always false where `matchMedia` is unavailable (jsdom). */
export function useMediaQuery(query: string) {
  const mql = typeof window.matchMedia === 'function' ? window.matchMedia(query) : null
  const [matches, setMatches] = createSignal(mql?.matches ?? false)
  if (mql) {
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    onCleanup(() => mql.removeEventListener('change', onChange))
  }
  return matches
}
