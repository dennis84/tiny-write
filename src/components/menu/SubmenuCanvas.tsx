import {Show} from 'solid-js'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useState} from '@/state'
import {IconAdjust, IconCheckBox, IconClose, IconGrid3x3} from '../Icon'
import {Link} from './Link'
import {Label, Sub} from './Style'

export const SubmenuCanvas = () => {
  const {canvasService, canvasCollabService} = useState()
  const showConfirmDialog = useConfirmDialog()

  const onClearCanvas = async () => {
    showConfirmDialog({
      title: 'Clear Canvas',
      content: 'Are you sure you want to clear the canvas?',
      onConfirm: async () => {
        await canvasService.clearCanvas()
        canvasCollabService.removeAll()
      },
    })
  }

  const onBackToContent = async () => {
    await canvasService.backToContent()
  }

  const onSnapToGrid = () => {
    canvasService.snapToGrid()
  }

  return (
    <>
      <Label>Canvas</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onClearCanvas} data-testid="clear_canvas">
          <IconClose /> Clear canvas
        </Link>
        <Link onClick={onBackToContent}>
          <IconAdjust /> Back to content
        </Link>
        <Link onClick={onSnapToGrid}>
          <IconGrid3x3 /> Snap to grid
          <Show when={canvasService.currentCanvas?.snapToGrid}>
            <IconCheckBox />
          </Show>
        </Link>
      </Sub>
    </>
  )
}
