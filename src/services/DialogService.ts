import {createSignal} from 'solid-js'

export interface DialogConfig {
  title: string
  text: string
  onConfirm?: () => void
  onCancel?: () => void
}

export class DialogService {
  private dialogSignal = createSignal<DialogConfig>()

  get dialog() {
    return this.dialogSignal[0]
  }

  setDialog(dialog: DialogConfig | undefined) {
    this.dialogSignal[1](dialog)
  }
}
