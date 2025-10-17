import {useBeforeLeave} from '@solidjs/router'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {isTauri} from '@/env'
import {useOpen} from '@/hooks/open'
import {DropTarget} from '@/services/MediaService'
import {useState} from '@/state'
import {enumFromValue} from '@/utils/enum'

const HighlightContent = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  border: 10px solid var(--primary-background-50);
  background: var(--primary-background-20);
  user-select: none;
  pointer-events: none;
`

export const DropFile = () => {
  const {mediaService} = useState()
  const {openFile} = useOpen()
  const mouseOverCoords = createMutable({x: 0, y: 0})
  const [dropTarget, setDropTarget] = createSignal<HTMLElement>()
  const [dragStarted, setDragStarted] = createSignal(false)

  const setClosestDropTarget = (el: Element | null) => {
    const dt = el?.closest('[data-drop-target]') as HTMLElement | null
    setDropTarget(dt ?? document.body)
  }

  const onDragStart = () => {
    // No dragstart is fired when dragging from outside the app
    setDragStarted(true)
  }

  const onDragEnd = () => {
    setDropTarget(undefined)
    setDragStarted(false)
  }

  const onDragOver = (e: DragEvent) => {
    if (dragStarted()) {
      return
    }

    e.preventDefault()
    mouseOverCoords.x = e.pageX
    mouseOverCoords.y = e.pageY
    setClosestDropTarget(e.target as Element)
  }

  const onDragLeave = () => {
    setDropTarget(undefined)
  }

  onMount(() => {
    // disable while tauri cannot handle both html5 and app dragdrop
    if (isTauri()) return
    const unlistenProm = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
        const {x, y} = event.payload.position
        setClosestDropTarget(document.elementFromPoint(x, y))
      } else if (event.payload.type === 'drop') {
        const {x, y} = event.payload.position
        const dt = enumFromValue(DropTarget, dropTarget()?.dataset.dropTarget)
        const result = await mediaService.dropPaths(event.payload.paths, [x, y], dt)
        setDropTarget(undefined)
        if (result?.file) openFile(result.file)
      } else {
        setDropTarget(undefined)
      }
    })

    onCleanup(async () => (await unlistenProm)())
  })

  onMount(() => {
    // enable html5 dragdrop for app and browser
    // if (isTauri()) return
    const onDrop = async (e: DragEvent) => {
      if (!e.dataTransfer) return

      if (dragStarted()) {
        return
      }

      e.preventDefault()

      const dt = enumFromValue(DropTarget, dropTarget()?.dataset.dropTarget)
      const x = mouseOverCoords.x
      const y = mouseOverCoords.y
      const files = Array.from(e.dataTransfer.files)
      if (files.length) {
        await mediaService.dropFiles(files, [x, y], dt)
      }

      setDropTarget(undefined)
      setDragStarted(false)
    }

    window.addEventListener('drop', onDrop, false)
    window.addEventListener('dragstart', onDragStart, false)
    window.addEventListener('dragend', onDragEnd, false)
    window.addEventListener('dragover', onDragOver, false)
    window.addEventListener('dragleave', onDragLeave, false)

    onCleanup(() => {
      window.removeEventListener('drop', onDrop, false)
      window.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('dragend', onDragEnd)
      window.removeEventListener('dragover', onDragOver, false)
      window.removeEventListener('dragleave', onDragLeave, false)
    })
  })

  useBeforeLeave(() => {
    mediaService.resetDroppedFiles()
  })

  return (
    <Show when={dropTarget()}>
      {(dt) => (
        <Portal mount={dt()}>
          <HighlightContent />
        </Portal>
      )}
    </Show>
  )
}
