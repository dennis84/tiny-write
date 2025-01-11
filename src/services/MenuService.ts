import {createSignal} from 'solid-js'

export class MenuService {
  private currentSignal = createSignal<string>()

  get current() {
    return this.currentSignal[0]
  }

  show(menu: string) {
    this.currentSignal[1](menu)
  }

  toggleMenu() {
    this.currentSignal[1](this.current() ? undefined : 'main')
  }

  hide() {
    this.currentSignal[1](undefined)
  }
}
