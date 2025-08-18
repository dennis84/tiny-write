import {createEffect, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {ToastService} from '@/services/ToastService'
import {useState} from '@/state'
import {Button} from './Button'

const ToastContainer = styled('div')`
  position: fixed;
  pointer-events: none;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  justify-content: center;
  display: flex;
`

const ToastBubble = styled('div')`
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
  z-index: var(--z-index-tooltip);
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  padding: 6px 8px;
  display: flex;
  align-items: center;
  animation: fadeInUp 0.2s ease-out;

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

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

  createEffect((prevId: any) => {
    const toast = toastService.current()
    let timeoutId: any

    if (prevId) clearTimeout(prevId)
    if (toast) {
      timeoutId = setTimeout(() => {
        toastService.close()
      }, toast.duration ?? ToastService.DEFAULT_DURATION)
    }

    return timeoutId
  })

  return (
    <Show when={toastService.current()}>
      {(toast) => (
        <ToastContainer>
          <ToastBubble>
            <div>{toast().message}</div>
            <Show when={toast().action}>
              <Button onClick={onClose}>{toast().action}</Button>
            </Show>
          </ToastBubble>
        </ToastContainer>
      )}
    </Show>
  )
}
