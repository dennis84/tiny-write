import {onCleanup, onMount} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {isTauri} from '@/env'
import {useState} from '@/state'
import {useOpen} from '@/hooks/open'

export const DropFile = () => {
  const {mediaService} = useState()
  const {open} = useOpen()
  const mouseEnterCoords = createMutable({x: 0, y: 0})

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  onMount(() => {
    if (!isTauri()) return
    const unlistenProm = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
      } else if (event.payload.type === 'drop') {
        for (const path of event.payload.paths) {
          const {x, y} = event.payload.position
          const result = await mediaService.dropPath(path, [x, y])
          if (result?.file) open(result.file)
        }
      }
    })

    onCleanup(async () => (await unlistenProm)())
  })

  onMount(() => {
    if (isTauri()) return
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()

      for (const file of e.dataTransfer?.files ?? []) {
        if (file.type.startsWith('image/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          await mediaService.dropFile(file, [x, y])
        }
      }
    }

    window.addEventListener('drop', onDrop, false)
    window.addEventListener('dragover', onDragOver, false)

    onCleanup(() => {
      window.removeEventListener('drop', onDrop, false)
      window.removeEventListener('dragover', onDragOver, false)
    })
  })

  return <></>
}
