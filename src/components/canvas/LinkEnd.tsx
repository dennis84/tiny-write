import {For, Show, createSignal, onMount} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {Vec2d} from '@tldraw/primitives'
import {CanvasLinkElement, File, isFile, useState} from '@/state'
import {createExtensions, createSchema} from '@/prosemirror-setup'

const Backdrop = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 100;
`

export default () => {
  const [, ctrl] = useState()
  const [contextMenu, setContextMenu] = createSignal<Vec2d | undefined>()

  const coordsStyle = (link?: CanvasLinkElement, cm?: Vec2d) => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const p = link ? new Vec2d(link.toX, link.toY) : cm
    if (!p) return

    const {camera} = currentCanvas
    const {x, y} = Vec2d.FromArray(camera.point).add(p).mul(camera.zoom)

    return {left: `${x}px`, top: `${y}px`}
  }

  const onBackdropClick = () => {
    ctrl.canvas.removeDeadLinks()
    setContextMenu(undefined)
  }

  const onNewFile = (link?: CanvasLinkElement, cm?: Vec2d) => {
    ctrl.canvas.newFile(link, cm)
    ctrl.canvas.removeDeadLinks()
    setContextMenu(undefined)
  }

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  const FileName = (p: {file: File; link?: CanvasLinkElement; cm?: Vec2d}) => {
    const onClick = () => {
      ctrl.canvas.addFile(p.file, p.link, p.cm)
      ctrl.canvas.removeDeadLinks()
      setContextMenu(undefined)
    }

    return (
      <div onClick={onClick}>
        🔗 {ctrl.file.getTitle(schema, p.file)}
      </div>
    )
  }

  const getFiles = (): File[] => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return []
    const tree = currentCanvas.parentId
      ? ctrl.tree.findTreeNode(currentCanvas.parentId)?.tree
      : undefined

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

  const getContextMenu = (): [CanvasLinkElement | undefined, Vec2d | undefined] | undefined => {
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

  return (
    <Show when={getContextMenu()} keyed>
      {([link, cm]) => <>
        <Portal mount={document.getElementById('container') ?? undefined}>
          <Backdrop onClick={onBackdropClick} />
        </Portal>
        <div class="canvas-link-end-tooltip" style={coordsStyle(link, cm)}>
          <div onClick={() => onNewFile(link, cm)} data-testid="link_end_new_file">🆕 New file</div>
          <Show when={getFiles()}>
            {(files) => <>
              <hr class="divider" />
              <For each={files()}>
                {(file: File) => <FileName file={file} link={link} cm={cm} />}
              </For>
            </>}
          </Show>
        </div>
      </>}
    </Show>
  )
}
