import {createEffect, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Button} from '@/components/Button'
import {useDialog} from '@/hooks/use-dialog'
import type {Dialog} from '@/services/DialogService'
import {type ToastProps, ToastService} from '@/services/ToastService'
import {useState} from '@/state'

const _ToastContainer = styled.div`
  position: fixed;
  pointer-events: none;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  justify-content: center;
  display: flex;
`

const _ToastBubble = styled.div`
  position: static;
  margin-bottom: 20px;
  align-self: flex-end;
  pointer-events: auto;
  max-width: 60vw;
  background: var(--tooltip-background);
  border-radius: var(--border-radius);
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
  line-height: 1.4;
  z-index: var(--z-index-dialog);
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  padding: 6px 8px;
  display: flex;
  align-items: center;
  animation: fadeInUp 0.2s ease-out;

  div {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    padding: 6px 8px;
    margin: 2px 0;
    min-height: 32px;
    cursor: var(--cursor-pointer);
    border-radius: var(--border-radius);
    word-break: break-all;
    .icon {
      margin-right: 5px;
    }
  }
`

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
