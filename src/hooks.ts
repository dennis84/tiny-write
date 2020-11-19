import {useCallback, useEffect, useRef} from 'react'

export const usePrevious = <T>(value: T | undefined) => {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })

  return ref.current
}

export const useDebouncedEffect = (fn, delay, deps) => {
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
