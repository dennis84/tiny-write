import {onCleanup, onMount} from 'solid-js'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {isTauri} from '@/env'
import {useState} from '@/state'

export const ResizeWindow = () => {
  const {appService} = useState()

  onMount(() => {
    if (!isTauri()) return
    const unlistenResizeProm = getCurrentWindow().onResized(async (event) => {
      const {width, height} = event.payload
      await appService.updateWindow({width, height})
    })

    const unlistenMoveProm = getCurrentWindow().onMoved(async (event) => {
      const {x, y} = event.payload
      await appService.updateWindow({x, y})
    })

    onCleanup(async () => {
      ;(await unlistenResizeProm)()
      ;(await unlistenMoveProm)()
    })
  })

  return null
}
