import {styled} from 'solid-styled-components'
import {Button, ButtonGroup, ButtonPrimary} from '@/components/Button'
import {DialogFooter} from '@/components/dialog/Style'
import type {Dialog} from '@/services/DialogService'
import {useDialog} from './use-dialog'

const DialogTitle = styled('h3')`
  margin: 10px 0;
  margin-bottom: 0;
`

interface ConfirmDialogState {
  title: string
  content: string
  onConfirm: () => void
  onCancel?: () => void
}

export const useConfirmDialog = () => {
  const ConfirmDialog = (p: {dialog: Dialog<ConfirmDialogState>}) => {
    const onConfirm = () => {
      closeDialog()
      p.dialog.state?.onConfirm()
    }

    const onCancel = () => {
      closeDialog()
      p.dialog.state?.onCancel?.()
    }

    return (
      <>
        <DialogTitle>{p.dialog.state?.title}</DialogTitle>
        <p>{p.dialog.state?.content}</p>
        <DialogFooter>
          <ButtonGroup>
            <ButtonPrimary onClick={onConfirm} data-testid="confirm">
              Confirm
            </ButtonPrimary>
            <Button onClick={onCancel} data-testid="cancel">
              Cancel
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </>
    )
  }

  const [showDialog, closeDialog] = useDialog({
    component: ConfirmDialog,
  })

  return (state: ConfirmDialogState) => {
    showDialog({state})
  }
}
