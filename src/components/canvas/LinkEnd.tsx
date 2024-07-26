import {For, Show, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {Vec} from '@tldraw/editor'
import {CanvasLinkElement, File, isFile, useState} from '@/state'

export const LinkEnd = () => {
  let tooltipRef!: HTMLDivElement
  const [, ctrl] = useState()
  const [contextMenu, setContextMenu] = createSignal<Vec | undefined>()

  const coordsStyle = (link?: CanvasLinkElement, cm?: Vec) => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const p = link ? new Vec(link.toX, link.toY) : cm
    if (!p) return

    const {camera} = currentCanvas
    const {x, y} = Vec.FromArray(camera.point).add(p).mul(camera.zoom)

    return {left: `${x}px`, top: `${y}px`}
  }

  const onNewFile = async (code = false, link?: CanvasLinkElement, cm?: Vec) => {
    await ctrl.canvas.newFile(code, link, cm)
    await ctrl.canvas.removeDeadLinks()
    setContextMenu(undefined)
  }

  const FileName = (p: {file: File; link?: CanvasLinkElement; cm?: Vec}) => {
    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      await ctrl.canvas.addFile(p.file, p.link, p.cm)
      await ctrl.canvas.removeDeadLinks()
      setContextMenu(undefined)
    }

    onMount(async () => {
      setTitle(await ctrl.file.getTitle(p.file))
    })

    return <div onClick={onClick}>🔗 {title()}</div>
  }

  const getFiles = (): File[] => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return []
    const tree =
      currentCanvas.parentId ? ctrl.tree.findTreeNode(currentCanvas.parentId)?.tree : undefined

    const files: File[] = []
    ctrl.tree.descendants((n) => {
      if (
        isFile(n.item) &&
        !n.item.deleted &&
        !currentCanvas.elements.find((el) => el.id === n.item.id)
      ) {
        files.push(n.item)
      }
    }, tree)

    return files
  }

  const getContextMenu = (): [CanvasLinkElement | undefined, Vec | undefined] | undefined => {
    const deadLink = ctrl.canvas.findDeadLinks()[0]
    const cm = contextMenu()
    if (!deadLink && !cm) return
    return [deadLink, cm]
  }

  onMount(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#grid')) {
        return
      }

      e.preventDefault()
      setContextMenu(ctrl.canvas.getPosition([e.clientX, e.clientY]))
    }

    document.oncontextmenu = onContextMenu
  })

  createEffect(() => {
    if (!getContextMenu()) return
    const onClick = async (e: MouseEvent) => {
      const target = e.target as Element
      if (tooltipRef === target || tooltipRef.contains(target)) return
      await ctrl.canvas.removeDeadLinks()
      setContextMenu(undefined)
    }

    document.body.addEventListener('mousedown', onClick)
    onCleanup(() => {
      document.body.removeEventListener('mousedown', onClick)
    })
  })

  return (
    <Show when={getContextMenu()} keyed>
      {([link, cm]) => (
        <>
          <div class="canvas-link-end-tooltip" style={coordsStyle(link, cm)} ref={tooltipRef}>
            <div onClick={() => onNewFile(false, link, cm)} data-testid="link_end_new_file">
              ✍️ New file
            </div>
            <div onClick={() => onNewFile(true, link, cm)} data-testid="link_end_new_code_file">
              🖥️ New code file
            </div>
            <Show when={getFiles()}>
              {(files) => (
                <>
                  <hr class="divider" />
                  <For each={files()}>
                    {(file: File) => <FileName file={file} link={link} cm={cm} />}
                  </For>
                </>
              )}
            </Show>
          </div>
        </>
      )}
    </Show>
  )
}
