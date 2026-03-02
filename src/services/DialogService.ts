import type {Placement, ReferenceElement} from '@floating-ui/dom'
import {createSignal, type JSX} from 'solid-js'

export interface Dialog<S = unknown> {
  component?: (props: {dialog: Dialog<S>}) => JSX.Element
  content?: string
  anchor?: ReferenceElement
  backdrop?: boolean
  delay?: number
  duration?: number
  offset?: number
  placement?: Placement
  fallbackPlacements?: Placement[]
  direction?: 'row' | 'column'
  toast?: boolean
  toastAction?: string
  onClose?: () => void
  state: S
}

interface ToastProps {
  message: string
  action?: string
  duration?: number
}

export class DialogService {
  private dialogsSignal = createSignal<Dialog<any>[]>([])

  get dialogs() {
    return this.dialogsSignal[0]
  }

  toast(toast: ToastProps) {
    this.open({
      content: toast.message,
      duration: toast.duration ?? 10_000,
      toast: true,
      state: undefined,
      toastAction: toast.action,
    })
  }

  open<S = unknown>(dialog: Dialog<S>) {
    this.dialogsSignal[1]((prev) => [...prev, dialog])
  }

  close<S = unknown>(dialog: Dialog<S>) {
    const len = this.dialogs().length
    this.dialogsSignal[1]((prev) => prev.filter((d) => d !== dialog))
    if (this.dialogs().length === len) return
    dialog.onClose?.()
  }
}
