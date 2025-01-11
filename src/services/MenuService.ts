import {createSignal} from 'solid-js'

export class MenuService {
  private menuSignal = createSignal<string>()
  private assistantSignal = createSignal<boolean>()

  get menu() {
    return this.menuSignal[0]
  }

  get assistant() {
    return this.assistantSignal[0]
  }

  show(menu: string) {
    this.menuSignal[1](menu)
  }

  toggleMenu() {
    this.menuSignal[1](this.menu() ? undefined : 'main')
  }

  hide() {
    this.menuSignal[1](undefined)
  }

  toggleAssistant() {
    this.assistantSignal[1](!this.assistant())
  }
}
