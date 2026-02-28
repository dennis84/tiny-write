import {createSignal} from 'solid-js'

export interface ToastProps {
  message: string
  action?: string
  duration?: number
}

export class ToastService {
  static readonly DEFAULT_DURATION = 10_000

  private toastSignal = createSignal<ToastProps>()

  get current() {
    return this.toastSignal[0]
  }

  open(toast: ToastProps) {
    this.toastSignal[1](toast)
  }

  close() {
    this.toastSignal[1](undefined)
  }
}
