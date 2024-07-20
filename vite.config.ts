import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import solidPlugin from 'vite-plugin-solid'
import {visualizer} from 'rollup-plugin-visualizer'
import {execSync} from 'node:child_process'

const commitHash = execSync('git rev-parse --short ${GITHUB_SHA:-HEAD}').toString().replace('\n', '')

export default defineConfig({
  plugins: [solidPlugin(), visualizer()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  resolve: {
    alias: [{find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url))}],
  },
})
