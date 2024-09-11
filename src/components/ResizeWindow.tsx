import {onCleanup, onMount} from 'solid-js'
import {getCurrent} from '@tauri-apps/api/window'
import {isTauri} from '@/env'
import {useState} from '@/state'

export const ResizeWindow = () => {
  const {appService} = useState()

  onMount(() => {
    if (!isTauri()) return
    const unlistenResizeProm = getCurrent().onResized(async (event) => {
      const {width, height} = event.payload
      await appService.updateWindow({width, height})
    })

    const unlistenMoveProm = getCurrent().onMoved(async (event) => {
      const {x, y} = event.payload
      await appService.updateWindow({x, y})
    })

    onCleanup(async () => {
      ;(await unlistenResizeProm)()
      ;(await unlistenMoveProm)()
    })
  })

  return <></>
}
