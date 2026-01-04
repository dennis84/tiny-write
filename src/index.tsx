import {render} from 'solid-js/web'
import {Init} from './components/Init'
import {info} from './remote/log'

// Enable ai mock with: `MOCK_AI=true npm run dev`
const mockAi = import.meta.env.VITE_MOCK_AI === 'true'

const enableMocking = async () => {
  if (mockAi) {
    const {CopilotMock} = await import('@/utils/CopilotMock')
    info('Setup copilot mock')
    CopilotMock.setup({endlessCode: true})
  }
}

const run = async () => {
  await enableMocking()
  const container = document.getElementById('container')
  if (container) {
    render(() => <Init />, container)
  }
}

void run()
