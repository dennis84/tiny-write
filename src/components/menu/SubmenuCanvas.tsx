import {useState} from '@/state'
import {IconAdjust, IconClose, IconGrid3x3} from '../Icon'
import {Label, Link, Sub} from './Style'

export const SubmenuCanvas = ({maybeHide}: {maybeHide: () => void}) => {
  const {canvasService, canvasCollabService} = useState()

  const onClearCanvas = async () => {
    await canvasService.clearCanvas()
    canvasCollabService.removeAll()
    maybeHide()
  }

  const onBackToContent = async () => {
    await canvasService.backToContent()
    maybeHide()
  }

  const onSnapToGrid = () => {
    canvasService.snapToGrid()
    maybeHide()
  }

  return (
    <>
      <Label>Canvas</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onClearCanvas} data-testid="clear-canvas">
          <IconClose /> Clear canvas
        </Link>
        <Link onClick={onBackToContent}>
          <IconAdjust /> Back to content
        </Link>
        <Link onClick={onSnapToGrid}>
          <IconGrid3x3 /> Snap to grid {canvasService.currentCanvas?.snapToGrid && '✅'}
        </Link>
      </Sub>
    </>
  )
}
