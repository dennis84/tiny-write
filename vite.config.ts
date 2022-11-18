import {resolve} from 'path'
import {defineConfig} from 'vite'
import solidPlugin from 'vite-plugin-solid'
import {visualizer} from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      plugins: [visualizer()],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    }
  }
})
