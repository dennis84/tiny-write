import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import type {State} from '@/state'
import type {AppService} from './AppService'

export enum MenuId {
  MAIN = 'main',
  BIN = 'bin',
  CODE_FORMAT = 'code_format',
  APPEARANCE = 'appearance',
  HELP = 'help',
  CHANGE_SET = 'change_set',
  AI_CONFIG = 'ai_config',
}

export class MenuService {
  private menuSignal = createSignal<MenuId>()
  private assistantSignal = createSignal<boolean>()

  get menu() {
    return this.menuSignal[0]
  }

  get assistant() {
    return this.assistantSignal[0]
  }

  get menuWidth() {
    const w = this.store.menuWidth
    return w ? `${w}px` : '280px'
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
    private appService: AppService,
  ) {}

  show(menu: MenuId) {
    this.menuSignal[1](menu)
  }

  toggleMenu() {
    this.menuSignal[1](this.menu() ? undefined : MenuId.MAIN)
  }

  hide() {
    this.menuSignal[1](undefined)
  }

  showAssistant() {
    this.assistantSignal[1](true)
  }

  toggleAssistant() {
    const oldStatus = this.assistant()
    if (oldStatus) this.appService.setLocation({threadId: undefined})
    this.assistantSignal[1](!oldStatus)
  }

  async setMenuWidth(width: number) {
    this.setState('menuWidth', width)
    await DB.setMenuWidth(width)
  }
}
