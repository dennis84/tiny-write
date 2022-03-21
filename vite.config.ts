import {defineConfig} from 'vite'
import solidPlugin from 'vite-plugin-solid'
import {visualizer} from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
    rollupOptions: {
      plugins: [visualizer()],
    },
  },
})
