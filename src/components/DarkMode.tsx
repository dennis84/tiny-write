import {onCleanup, onMount} from 'solid-js'
import {useState} from '@/state'

export const DarkMode = () => {
  const {configService} = useState()
  onMount(() => {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
    const onUpdateDarkMode = () => configService.updateDarkMode()
    matchDark.addEventListener('change', onUpdateDarkMode)
    onCleanup(() => matchDark.removeEventListener('change', onUpdateDarkMode))
  })

  return null
}
