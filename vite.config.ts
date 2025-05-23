import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import solidPlugin from 'vite-plugin-solid'
import {visualizer} from 'rollup-plugin-visualizer'
import Icons from 'unplugin-icons/vite'
import {execSync} from 'node:child_process'

const commitHash = execSync('git rev-parse --short ${GITHUB_SHA:-HEAD}')
  .toString()
  .replace('\n', '')

export default defineConfig({
  plugins: [solidPlugin(), visualizer(), Icons({compiler: 'solid'})],
  server: {
    host: process.env.TAURI_DEV_HOST || 'localhost',
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
