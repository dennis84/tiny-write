import {createSignal, type JSX} from 'solid-js'

export interface DialogConfig {
  title?: string
  text?: string
  component?: (props: {dialog: DialogConfig}) => JSX.Element
  onConfirm?: () => void
  onCancel?: () => void
}

export class DialogService {
  private dialogsSignal = createSignal<DialogConfig[]>([])

  get dialogs() {
    return this.dialogsSignal[0]
  }

  open(dialog: DialogConfig) {
    this.dialogsSignal[1]((prev) => [...prev, dialog])
  }

  close(dialog: DialogConfig) {
    this.dialogsSignal[1]((prev) => prev.filter((d) => d !== dialog))
  }
}
