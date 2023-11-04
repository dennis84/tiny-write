import {For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Vec2d} from '@tldraw/primitives'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {CanvasLinkElement, File, useState} from '@/state'
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
  const [store, ctrl] = useState()

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
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, p.file.ydoc)
    const state = yDocToProsemirrorJSON(ydoc, p.file.id)
    const doc = Node.fromJSON(schema, state)

    const onClick = () => {
      ctrl.canvas.addFile(p.file, p.link)
    }

    return (
      <div onClick={onClick}>
        🔗 {doc.textBetween(0, Math.min(20, doc.content.size), ' ')}
      </div>
    )
  }

  const getFiles = () => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return []
    return store.files
      .filter((f) => f.lastModified)
      .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())
      .filter((file) => !currentCanvas.elements.find((el) => el.id === file.id))
      .slice(0, 10)
  }

  return (
    <Show when={ctrl.canvas.findDeadLinks()[0]} keyed>
      {(link) => <>
        <Backdrop onClick={onBackdropClick} />
        <div
          class="canvas-link-end-tooltip"
          style={coordsStyle(link)}
        >
          <div
            onClick={() => onNewFile(link)}
            data-testid="link_end_new_file"
          >🆕 New file</div>
          <Show when={getFiles().length > 0}>
            <hr class="divider" />
          </Show>
          <For each={getFiles()}>
            {(file: File) => <FileName file={file} link={link} />}
          </For>
        </div>
      </>}
    </Show>
  )
}
