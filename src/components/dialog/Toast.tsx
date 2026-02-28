import {createEffect, Show} from 'solid-js'
import {Button} from '@/components/Button'
import {useDialog} from '@/hooks/use-dialog'
import type {Dialog} from '@/services/DialogService'
import {type ToastProps, ToastService} from '@/services/ToastService'
import {useState} from '@/state'

export const Toast = () => {
  const {toastService} = useState()

  const onClose = () => {
    toastService.close()
  }

  createEffect((prevId: NodeJS.Timeout | undefined) => {
    const toast = toastService.current()
    let timeoutId: NodeJS.Timeout | undefined

    if (prevId) clearTimeout(prevId)
    if (toast) {
      showToast({state: toast})
      timeoutId = setTimeout(() => {
        toastService.close()
        hideToast()
      }, toast.duration ?? ToastService.DEFAULT_DURATION)
    }

    return timeoutId
  })

  const ToastDialog = (p: {dialog: Dialog<ToastProps>}) => (
    <>
      <div>{p.dialog.state.message}</div>
      <Show when={p.dialog.state.action}>
        <Button onClick={onClose}>{p.dialog.state.action}</Button>
      </Show>
    </>
  )

  const [showToast, hideToast] = useDialog({
    component: ToastDialog,
    toast: true,
  })

  return null
}
