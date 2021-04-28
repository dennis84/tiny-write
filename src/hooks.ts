import {useCallback, useEffect, useRef, useLayoutEffect} from 'react'

export const useDebouncedEffect = (
  fn: () => void,
  delay: number,
  deps: unknown[]
) => {
  const callback = useCallback(fn, deps)

  useEffect(() => {
    const handler = setTimeout(() => {
      callback()
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [callback, delay])
}

export const useDynamicCallback = <T extends (...args: any[]) => any>(callback: T) => {
  const ref = useRef(callback)

  useLayoutEffect(() => {
    ref.current = callback
  }, [callback])

  return useCallback((...args) => ref.current(...args), [])
}
