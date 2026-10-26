import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { cn } from '@utils/cn'
import { theme, toggleTheme } from '@utils/theme'

export default function ThemeToggle(props: { class?: string }): JSX.Element {
  const label = () => (theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
  return (
    <button
      type="button"
      class={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-popover text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.class,
      )}
      aria-label={label()}
      title={label()}
      data-testid="theme-toggle"
      onClick={() => toggleTheme()}
    >
      <Show
        when={theme() === 'dark'}
        fallback={
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
          </svg>
        }
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </Show>
    </button>
  )
}
