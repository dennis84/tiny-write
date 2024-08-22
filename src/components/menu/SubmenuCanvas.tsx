import {isMac, mod} from '@/env'
import {useState} from '@/state'
import {Keys, Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

export const SubmenuCanvas = ({maybeHide}: {maybeHide: () => void}) => {
  const [, ctrl] = useState()
  const modKey = isMac ? '⌘' : mod

  const onNewFile = async () => {
    await ctrl.canvas.newFile()
    maybeHide()
  }

  const onClearCanvas = async () => {
    await ctrl.canvas.clearCanvas()
    maybeHide()
  }

  const onBackToContent = async () => {
    await ctrl.canvas.backToContent()
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
          <Icon>post_add</Icon> New file <Keys keys={[modKey, 'n']} />
        </Link>
        <Link onClick={onClearCanvas}>
          <Icon>clear</Icon> Clear canvas
        </Link>
        <Link onClick={onBackToContent}>
          <Icon>adjust</Icon> Back to content
        </Link>
        <Link onClick={onSnapToGrid}>
          <Icon>grid_3x3</Icon> Snap to grid {ctrl.canvas.currentCanvas?.snapToGrid && '✅'}
        </Link>
      </Sub>
    </>
  )
}
