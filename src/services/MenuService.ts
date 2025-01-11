import {createSignal} from 'solid-js'

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
    this.assistantSignal[1](!this.assistant())
  }
}
