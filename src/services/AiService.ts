import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import type {State} from '@/state'

export class AiService {
  get sidebarWidth() {
    const w = this.store.ai?.sidebarWidth
    return w ? `${w}px` : '50vw'
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async setSidebarWidth(width: number) {
    this.setState('ai', 'sidebarWidth', width)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async setAutoContext(autoContext: boolean) {
    this.setState('ai', 'autoContext', autoContext)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }
}
