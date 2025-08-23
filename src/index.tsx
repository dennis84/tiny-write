import {render} from 'solid-js/web'
import {Init} from './components/Init'
import {isDev, isTest} from './env'
import {info} from './remote/log'

const enableMocking = async () => {
  if (isDev && !isTest) {
    const {CopilotMock} = await import('@/utils/CopilotMock')
    info('Setup copilot mock')
    CopilotMock.setup()
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
