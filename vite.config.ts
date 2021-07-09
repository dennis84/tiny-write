import reactRefresh from '@vitejs/plugin-react-refresh'
import {defineConfig} from 'vite'
import {visualizer} from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [reactRefresh()],
  build: {
    rollupOptions: {
      plugins: [visualizer()],
    },
  },
})
