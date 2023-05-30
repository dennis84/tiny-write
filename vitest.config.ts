import {resolve} from 'path'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    }
  }
})
