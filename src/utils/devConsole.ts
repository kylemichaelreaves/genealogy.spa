export type DevConsoleLevel = 'log' | 'info' | 'warn' | 'error'

/**
 * Logs only when `import.meta.env.DEV` is true (Vite dev server / dev build).
 * No-ops in production — avoids noisy or sensitive logs in shipped bundles.
 */
export function devConsole(level: DevConsoleLevel, ...args: unknown[]): void {
  if (!import.meta.env.DEV) return
  console[level](...args)
}
