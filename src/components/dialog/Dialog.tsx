import {onCleanup, onMount, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Button, ButtonGroup, ButtonPrimary} from '../Button'
import {TooltipContainer} from '../Tooltip'

const Layer = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #00000080;
  z-index: var(--z-index-dialog);
`

export const DialogTitle = styled('h3')`
  margin: 10px 0;
  margin-bottom: 0;
`

export const Dialog = () => {
  const {appService, dialogService} = useState()

  const onConfirm = () => {
    const currentDialog = dialogService.dialog()
    if (!currentDialog) return
    dialogService.setDialog(undefined)
    currentDialog.onConfirm?.()
  }

  const onCancel = () => {
    const currentDialog = dialogService.dialog()
    if (!currentDialog) return
    dialogService.setDialog(undefined)
    currentDialog.onCancel?.()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const currentDialog = dialogService.dialog()
    if (!currentDialog) return
    if (e.key === 'Escape') {
      dialogService.setDialog(undefined)
      currentDialog.onCancel?.()
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onCleanup(() => document.removeEventListener('keydown', onKeyDown))

  return (
    <Show when={dialogService.dialog()}>
      {(dialog) => (
        <Portal mount={appService.layoutRef}>
          <Layer>
            <TooltipContainer>
              <DialogTitle>{dialog().title}</DialogTitle>
              <p>{dialog().text}</p>
              <ButtonGroup>
                <ButtonPrimary onClick={onConfirm}>Confirm</ButtonPrimary>
                <Button onClick={onCancel}>Cancel</Button>
              </ButtonGroup>
            </TooltipContainer>
          </Layer>
        </Portal>
      )}
    </Show>
  )
}
