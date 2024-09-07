import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts', 'test/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['html'],
      include: ['src/**'],
      exclude: ['node_modules/**', 'src-tauri/**'],
    },
    server: {
      deps: {
        inline: ['@tldraw/editor', '@solidjs/testing-library', '@solidjs/router'],
      },
    },
    setupFiles: ['./test/unit/setup.ts'],
  },
  resolve: {
    alias: [{find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url))}],
  },
})
