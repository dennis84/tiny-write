import {onCleanup} from 'solid-js'

export const useDebounce = (cb: (...args: any[]) => void, timeoutMs = 100) => {
  let id: any
  const fn = (...args: any[]) => {
    if (id) clearTimeout(id)
    id = setTimeout(() => cb(...args), timeoutMs)
  }

  fn.cancel = () => clearTimeout(id)
  onCleanup(fn.cancel)
  return fn
}
