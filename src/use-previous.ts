import {useEffect, useRef} from 'react'

export const usePrevious = <T>(value: T | undefined) => {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })

  return ref.current
}
