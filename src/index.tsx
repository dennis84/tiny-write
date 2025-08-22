import {render} from 'solid-js/web'
import {Init} from './components/Init'
import {info} from './remote/log'

const container = document.getElementById('container')
if (container) {
  render(() => <Init />, container)
}

const enableMocking = async () => {
  if (import.meta.env.DEV) {
    const {CopilotMock} = await import('@/utils/CopilotMock')
    info('Setup copilot mock')
    CopilotMock.setup()
  }
}

void enableMocking()
