import {InputLine, type InputLineConfig} from '@/components/dialog/InputLine'
import type {Dialog} from '@/services/DialogService'
import {useDialog} from './use-dialog'

export const useInputLine = () => {
  const InputLineDialog = (p: {dialog: Dialog<InputLineConfig>}) => {
    const onEnter = (value: string) => {
      closeDialog()
      p.dialog.state?.onEnter(value)
    }

    return (
      <InputLine
        value={p.dialog.state?.value ?? ''}
        placeholder={p.dialog.state?.placeholder}
        words={p.dialog.state?.words}
        onEnter={onEnter}
      />
    )
  }

  const [showDialog, closeDialog] = useDialog({
    component: InputLineDialog,
  })

  return (state: InputLineConfig) => {
    showDialog({state})
  }
}
