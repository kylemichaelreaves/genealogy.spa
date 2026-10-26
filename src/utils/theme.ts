import { createSignal } from 'solid-js'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'genealogy-theme'

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

// index.html applies the saved theme before first paint; this mirrors it.
const [theme, setThemeSignal] = createSignal<Theme>(readTheme())

export { theme }

export function setTheme(next: Theme): void {
  document.documentElement.classList.toggle('dark', next === 'dark')
  setThemeSignal(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Storage blocked (private mode) — the toggle still works for this visit.
  }
}

export function toggleTheme(): void {
  setTheme(theme() === 'dark' ? 'light' : 'dark')
}
