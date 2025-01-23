import {createSignal} from 'solid-js'

interface Toast {
  message: string
  action?: string
  duration?: number
}

export class ToastService {
  static readonly DEFAULT_DURATION = 10_000

  private toastSignal = createSignal<Toast>()

  get current() {
    return this.toastSignal[0]
  }

  open(toast: Toast) {
    this.toastSignal[1](toast)
  }

  close() {
    this.toastSignal[1](undefined)
  }
}
