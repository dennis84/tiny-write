import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['html'],
    },
    server: {
      deps: {
        inline: ['@tldraw/editor']
      }
    },
  },
  resolve: {
    alias: [
      {find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url))},
    ]
  }
})
