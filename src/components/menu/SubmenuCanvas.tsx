import {useState} from '@/state'
import {Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

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
        <Link onClick={onClearCanvas}>
          <Icon>clear</Icon> Clear canvas
        </Link>
        <Link onClick={onBackToContent}>
          <Icon>adjust</Icon> Back to content
        </Link>
        <Link onClick={onSnapToGrid}>
          <Icon>grid_3x3</Icon> Snap to grid {canvasService.currentCanvas?.snapToGrid && '✅'}
        </Link>
      </Sub>
    </>
  )
}
