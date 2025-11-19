import {createEffect} from 'solid-js'
import {useTitle} from '@/hooks/use-title'

export const Title = () => {
  const title = useTitle()

  createEffect(() => {
    document.title = title() ?? ''
  })

  return null
}
