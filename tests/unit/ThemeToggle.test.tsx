import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// theme.ts reads <html class="dark"> once at import, mirroring what index.html set
// before first paint — so each test loads a fresh copy after arranging the page.
async function load() {
  vi.resetModules()
  const theme = await import('@utils/theme')
  const { default: ThemeToggle } = await import('@components/shared/ThemeToggle')
  return { ...theme, ThemeToggle }
}

let dispose: (() => void) | undefined
beforeEach(() => {
  document.documentElement.className = ''
  localStorage.clear()
})
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
})

describe('theme', () => {
  it('starts from whatever index.html applied', async () => {
    document.documentElement.classList.add('dark')
    const { theme } = await load()
    expect(theme()).toBe('dark')
  })

  it('switches the class on <html> and remembers the choice', async () => {
    const { theme, setTheme, toggleTheme } = await load()
    expect(theme()).toBe('light')
    setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('genealogy-theme')).toBe('dark')
    toggleTheme()
    expect(theme()).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('genealogy-theme')).toBe('light')
  })

  it('still switches when storage is blocked', async () => {
    const { theme, setTheme } = await load()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    setTheme('dark')
    expect(theme()).toBe('dark')
    spy.mockRestore()
  })
})

describe('ThemeToggle', () => {
  it('names the theme it switches to and flips on click', async () => {
    const { ThemeToggle, theme } = await load()
    const host = document.createElement('div')
    document.body.append(host)
    dispose = render(() => <ThemeToggle />, host)
    const button = host.querySelector('button')!
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme')
    button.click()
    expect(theme()).toBe('dark')
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme')
    button.click()
    expect(theme()).toBe('light')
  })
})
