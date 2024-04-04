import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import solidPlugin from 'vite-plugin-solid'
import {visualizer} from "rollup-plugin-visualizer"

export default defineConfig({
  plugins: [solidPlugin(), visualizer()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: [
      {find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url))},
    ]
  }
})
