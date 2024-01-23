import {For, Show} from 'solid-js'
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

  const coordsStyle = (link: CanvasLinkElement) => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const {zoom, point: [px, py]} = currentCanvas.camera
    const point = new Vec2d(px, py)
    const {x, y} = point.addXY(link.toX ?? 0, link.toY ?? 0).mul(zoom)

    return {left: `${x}px`, top: `${y}px`}
  }

  const onBackdropClick = () => {
    ctrl.canvas.removeDeadLinks()
  }

  const onNewFile = (link: CanvasLinkElement) => {
    ctrl.canvas.newFile(link)
    ctrl.canvas.removeDeadLinks()
  }

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  const FileName = (p: {file: File; link: CanvasLinkElement}) => {
    const onClick = () => {
      ctrl.canvas.addFile(p.file, p.link)
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

  return (
    <Show when={ctrl.canvas.findDeadLinks()[0]} keyed>
      {(link) => <>
        <Backdrop onClick={onBackdropClick} />
        <div class="canvas-link-end-tooltip" style={coordsStyle(link)}>
          <div onClick={() => onNewFile(link)} data-testid="link_end_new_file">🆕 New file</div>
          <Show when={getFiles()}>
            {(files) => <>
              <hr class="divider" />
              <For each={files()}>
                {(file: File) => <FileName file={file} link={link} />}
              </For>
            </>}
          </Show>
        </div>
      </>}
    </Show>
  )
}
