import type {Placement, ReferenceElement} from '@floating-ui/dom'
import {createSignal, type JSX} from 'solid-js'

export interface Dialog<S = unknown> {
  component?: (props: {dialog: Dialog<S>}) => JSX.Element
  anchor?: ReferenceElement
  backdrop?: boolean
  delay?: number
  offset?: number
  placement?: Placement
  fallbackPlacements?: Placement[]
  direction?: 'row' | 'column'
  toast?: boolean
  onClose?: () => void
  state: S
}

export class DialogService {
  private dialogsSignal = createSignal<Dialog<any>[]>([])

  get dialogs() {
    return this.dialogsSignal[0]
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
