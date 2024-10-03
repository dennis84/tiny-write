import {onCleanup, onMount} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {useNavigate} from '@solidjs/router'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {isTauri} from '@/env'
import {info} from '@/remote'
import {useState} from '@/state'

export const DropFile = () => {
  const {mediaService} = useState()
  const navigate = useNavigate()
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
        info('🔗 User hovering')
      } else if (event.payload.type === 'drop') {
        info('🔗 User dropped')
        for (const path of event.payload.paths) {
          const {x, y} = event.payload.position
          const result = await mediaService.dropPath(path, [x, y])
          if (result?.file) {
            navigate(`/${result.file.code ? 'code' : 'editor'}/${result.file.id}`)
          }
        }
      } else {
        info('🔗 File drop cancelled')
      }
    })

    onCleanup(async () => (await unlistenProm)())
  })

  onMount(() => {
    if (isTauri()) return
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()

      // don't drop files in codemirror
      if ((e.target as Element).closest('.cm-editor')) {
        return
      }

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
