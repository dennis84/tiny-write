import {createSignal, untrack} from 'solid-js'
import type {Dialog} from '@/services/DialogService'
import {useState} from '@/state'

export const useDialog = <S = unknown>(options: Dialog<S> = {}) => {
  const {dialogService} = useState()
  const [cur, setCur] = createSignal<Dialog<S>>()

  const show = (opts: Partial<Dialog<S>> = {}) => {
    const onClose = () => {
      setCur(undefined)
      const userOnClose = opts.onClose ?? options.onClose
      userOnClose?.()
    }

    const config = {...opts, ...options, onClose}

    untrack(() => {
      if (cur()) close()
      dialogService.open(config)
    })

    setCur(config)
  }

  const close = () => {
    const c = cur()
    if (c) {
      setCur(undefined)
      dialogService.close(c)
    }
  }

  return [show, close, cur] as const
}
