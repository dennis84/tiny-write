import {isMac, mod} from '@/env'
import {useState} from '@/state'
import {Keys, Label, Link, Sub} from './Menu'

export default ({maybeHide}: {maybeHide: () => void}) => {
  const [, ctrl] = useState()
  const modKey = isMac ? '⌘' : mod

  const onNewCanvas = () => {
    ctrl.canvas.newCanvas()
    maybeHide()
  }

  const onNewFile = () => {
    ctrl.canvas.newFile()
    maybeHide()
  }

  const onClearCanvas = () => {
    ctrl.canvas.clearCanvas()
    maybeHide()
  }

  const onRemoveLinks = () => {
    ctrl.canvas.removeLinks()
    maybeHide()
  }

  const onBackToContent = () => {
    ctrl.canvas.backToContent()
    maybeHide()
  }

  return (
    <>
      <Label>Canvas</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onNewCanvas} data-testid="new_canvas">
          New canvas  🆕 <Keys keys={[modKey, 'n']} />
        </Link>
        <Link onClick={onNewFile} data-testid="new_file">
          New file 📝
        </Link>
        <Link onClick={onClearCanvas}>Clear Canvas 🧽</Link>
        <Link onClick={onRemoveLinks}>Remove links</Link>
        <Link onClick={onBackToContent}>Back to content 🎯</Link>
      </Sub>
    </>
  )
}
