import {For, Match, onCleanup, onMount, Switch} from 'solid-js'
import {Dynamic, Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Button, ButtonGroup, ButtonPrimary} from '../Button'
import {TooltipContainer} from '../Tooltip'
import {DialogConfig} from '@/services/DialogService'

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

const Backdrop = styled('div')`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-index-tooltip);
`

export const DialogTitle = styled('h3')`
  margin: 10px 0;
  margin-bottom: 0;
`

export const Dialog = (props: {dialog: DialogConfig}) => {
  let containerRef!: HTMLDivElement
  const {appService, dialogService} = useState()

  const onConfirm = () => {
    dialogService.close(props.dialog)
    props.dialog.onConfirm?.()
  }

  const onCancel = () => {
    dialogService.close(props.dialog)
    props.dialog.onCancel?.()
  }

  const onLayerClick = (e: MouseEvent) => {
    if (containerRef.contains(e.target as Node)) return
    onCancel()
  }

  return (
    <Portal mount={appService.layoutRef}>
      <Layer onClick={onLayerClick}>
        <TooltipContainer ref={containerRef}>
          <Switch>
            <Match when={props.dialog.component}>
              {(comp) => <Dynamic component={comp()} dialog={props.dialog} />}
            </Match>
            <Match when={true}>
              <DialogTitle>{props.dialog.title}</DialogTitle>
              <p>{props.dialog.text}</p>
              <ButtonGroup>
                <ButtonPrimary onClick={onConfirm}>Confirm</ButtonPrimary>
                <Button onClick={onCancel}>Cancel</Button>
              </ButtonGroup>
            </Match>
          </Switch>
        </TooltipContainer>
      </Layer>
    </Portal>
  )
}

export const Dialogs = () => {
  const {dialogService} = useState()

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const dialogs = dialogService.dialogs()
      const dialog = dialogs[dialogs.length - 1]
      if (!dialog) return
      dialogService.close(dialog)
      dialog.onCancel?.()
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onCleanup(() => document.removeEventListener('keydown', onKeyDown))

  return <For each={dialogService.dialogs()}>{(dialog) => <Dialog dialog={dialog} />}</For>
}
