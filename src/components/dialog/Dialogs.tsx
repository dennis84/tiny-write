import {For, onCleanup, onMount} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {useState} from '@/state'
import {Dialog} from './Dialog'

export const Dialogs = () => {
  const {dialogService} = useState()

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const dialogs = dialogService.dialogs()
      const dialog = dialogs[dialogs.length - 1]
      if (!dialog) return
      dialogService.close(dialog)
      dialog.onClose?.()
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onCleanup(() => document.removeEventListener('keydown', onKeyDown))

  return (
    <For each={dialogService.dialogs()}>
      {(dialog, i) => (
        <Dialog
          anchor={dialog.anchor}
          onClose={() => dialogService.close(dialog)}
          backdrop={dialog.backdrop}
          delay={dialog.delay}
          index={i()}
        >
          <Dynamic component={dialog.component} dialog={dialog} />
        </Dialog>
      )}
    </For>
  )
}
