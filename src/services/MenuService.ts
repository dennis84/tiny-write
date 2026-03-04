import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import type {State} from '@/types'

export enum SubmenuId {
  BIN = 'bin',
  CODE_FORMAT = 'code_format',
  APPEARANCE = 'appearance',
  HELP = 'help',
  CHANGE_SET = 'change_set',
  AI_CONFIG = 'ai_config',
}

export class MenuService {
  private submenuSignal = createSignal<SubmenuId>()
  private assistantSignal = createSignal<boolean>(false)

  get submenu() {
    return this.submenuSignal[0]
  }

  get assistant() {
    return this.assistantSignal[0]
  }

  get menuOpen() {
    return this.store.sidebar?.open ?? false
  }

  get menuWidth() {
    const w = this.store.sidebar?.width
    return w ? `${w}px` : '280px'
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  setSubmenu(menu?: SubmenuId) {
    this.submenuSignal[1](menu)
  }

  async toggleMenu() {
    const open = !(this.store.sidebar?.open ?? false)
    this.setState('sidebar', (sb) => (sb ? {...sb, open} : {open}))
    await DB.setSidebar(this.store.sidebar)
  }

  showAssistant() {
    this.assistantSignal[1](true)
  }

  toggleAssistant(): boolean {
    const newStatus = !this.assistant()
    this.assistantSignal[1](newStatus)
    return newStatus
  }

  async setMenuWidth(width: number) {
    this.setState('sidebar', (sb) => (sb ? {...sb, width} : {width}))
    await DB.setSidebar(this.store.sidebar)
  }
}
