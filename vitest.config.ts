import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const alias = (find: string, to: string) => ({ find, replacement: path.resolve(__dirname, to) })

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // lcov is what SonarCloud reads (sonar.javascript.lcov.reportPaths); text keeps the
      // summary visible in CI logs. The default reporters do not include lcov.
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/index.tsx'],
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
    alias: [
      alias('@genealogy', 'src/components/genealogy'),
      alias('@components', 'src/components'),
      alias('@composables', 'src/composables'),
      alias('@api', 'src/api'),
      alias('@utils', 'src/utils'),
    ],
  },
})
