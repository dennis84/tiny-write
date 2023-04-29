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

  const onClearCanvas = () => ctrl.canvas.clearCanvas()

  const onBackToContent = () => ctrl.canvas.backToContent()

  return (
    <>
      <Label>Canvas</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onNewCanvas} data-testid="new-canvas">
          New canvas  🆕 <Keys keys={[modKey, 'n']} />
        </Link>
        <Link onClick={onClearCanvas}>Clear Canvas</Link>
        <Link onClick={onBackToContent}>Back to content</Link>
      </Sub>
    </>
  )
}
