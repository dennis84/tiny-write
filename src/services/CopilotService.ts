import {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {State} from '@/state'
import {connectCopilot, disableCopilot, enableCopilot} from '@/remote/copilot'

export class CopilotService {
  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async connectCopilot() {
    await connectCopilot()
  }

  async enable() {
    const copilot = {...this.store.ai?.copilot, enabled: true}
    const ai = {...this.store.ai, copilot}
    this.setState('ai', ai)
    await DB.setAi(ai)
    await enableCopilot()
  }

  async disable() {
    const copilot = {enabled: false}
    const ai = {...this.store.ai, copilot}
    this.setState('ai', ai)
    await DB.setAi(ai)
    await disableCopilot()
  }

  setUser(user: string) {
    this.setState('ai', 'copilot', 'user', user)
  }
}
