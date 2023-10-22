import {isMac, mod} from '@/env'
import {useState} from '@/state'
import {Keys, Label, Link, Sub} from './Menu'

export default ({maybeHide}: {maybeHide: () => void}) => {
  const [, ctrl] = useState()
  const modKey = isMac ? '⌘' : mod

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

  const onSnapToGrid = () => {
    ctrl.canvas.snapToGrid()
    maybeHide()
  }

  return (
    <>
      <Label>Canvas</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onNewFile} data-testid="new_file">
          New file 📝 <Keys keys={[modKey, 'n']} />
        </Link>
        <Link onClick={onClearCanvas}>Clear Canvas 🧽</Link>
        <Link onClick={onRemoveLinks}>Remove links</Link>
        <Link onClick={onBackToContent}>Back to content 🎯</Link>
        <Link onClick={onSnapToGrid}>Snap to grid 🫰 {ctrl.canvas.currentCanvas?.snapToGrid && '✅'}</Link>
      </Sub>
    </>
  )
}
