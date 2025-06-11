import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {createMutable} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {isTauri} from '@/env'
import type {Attachment} from '@/state'
import {basename, getMimeType, readBinaryFile} from '@/remote/editor'

const HighlightContent = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  border: 10px solid var(--primary-background-50);
  user-select: none;
  pointer-events: none;
  background: #00000033;
`

interface Props {
  dropArea?: () => HTMLElement
  onDrop: (attachments: Attachment[]) => void
}

export const DropAttachment = (props: Props) => {
  const mouseEnterCoords = createMutable({x: 0, y: 0})
  const [dragging, setDragging] = createSignal(false)

  const dropArea = (): HTMLElement => props.dropArea?.() ?? document.body

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
    setDragging(true)
  }

  const onDragLeave = () => {
    setDragging(false)
  }

  onMount(() => {
    if (!isTauri()) return
    const unlistenProm = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
        setDragging(true)
      } else if (event.payload.type === 'drop') {
        setDragging(false)
        const newFilesData: Attachment[] = []
        for (const path of event.payload.paths) {
          const arr = await readBinaryFile(path)
          const mime = await getMimeType(path)
          const name = await basename(path)
          const base64 = btoa(String.fromCharCode(...arr))
          const data = `data:${mime};base64,${base64}`
          newFilesData.push({type: 'image', name, data})
        }

        props.onDrop(newFilesData)
      }
    })

    onCleanup(async () => (await unlistenProm)())
  })

  onMount(() => {
    if (isTauri()) return
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)

      const files = e.dataTransfer?.files ?? []
      const newFilesData: Attachment[] = []

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64String = e.target?.result as string
            newFilesData.push({type: 'image', name: file.name, data: base64String})
            console.log(base64String)

            // Update state when all files are processed
            if (newFilesData.length === files.length) {
              props.onDrop(newFilesData)
            }
          }
          reader.readAsDataURL(file)
        }
      }
    }

    dropArea().addEventListener('drop', onDrop, false)
    dropArea().addEventListener('dragover', onDragOver, false)
    dropArea().addEventListener('dragleave', onDragLeave, false)

    onCleanup(() => {
      dropArea().removeEventListener('drop', onDrop, false)
      dropArea().removeEventListener('dragover', onDragOver, false)
      dropArea().removeEventListener('dragleave', onDragLeave, false)
    })
  })

  return (
    <>
      <Show when={dragging()}>
        <Portal mount={dropArea()}>
          <HighlightContent />
        </Portal>
      </Show>
    </>
  )
}
