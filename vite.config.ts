import { fileURLToPath, URL } from 'node:url'

// `vitest/config` re-exports Vite's defineConfig but adds the `test`
// key to the accepted config shape.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // On GitHub Pages the site is served from https://<user>.github.io/Bookshelf/,
  // so production builds need the subpath. Dev server still serves from /.
  base: command === 'build' ? '/Bookshelf/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}))
