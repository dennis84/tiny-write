import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {DB} from '@/db'
import {State} from '@/state'
import {info} from '@/remote/log'
import {connectCopilot, copilotChatModels, disableCopilot, enableCopilot} from '@/remote/copilot'

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

  async getChatModels(): Promise<string[]> {
    return copilotChatModels()
  }

  async setChatModel(model: string) {
    info(`Set chat model (model=${model})`)
    this.setState('ai', 'copilot', 'chatModel', model)
    const ai = unwrap(this.store.ai)
    if (ai) DB.setAi(ai)
  }
}
