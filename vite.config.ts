import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const alias = (find: string, to: string) => ({ find, replacement: path.resolve(__dirname, to) })

export default defineConfig({
  plugins: [tailwindcss(), solid()],
  server: {
    host: 'localhost',
    port: 5174,
  },
  resolve: {
    // Same alias names as the source repo, so the genealogy subtree's imports
    // need no rewriting.
    alias: [
      alias('@genealogy', 'src/components/genealogy'),
      alias('@components', 'src/components'),
      alias('@composables', 'src/composables'),
      alias('@api', 'src/api'),
      alias('@utils', 'src/utils'),
    ],
  },
})
