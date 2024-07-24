import {useState} from '@/state'
import {isMac, mod} from '@/env'
import {Keys, Label, Link, Sub} from './Menu'

export const SubmenuCanvasEdit = () => {
  const [, ctrl] = useState()

  const modKey = isMac ? '⌘' : mod

  const onUndo = () => {
    ctrl.collab?.undoManager?.undo()
  }

  const onRedo = () => {
    ctrl.collab?.undoManager?.redo()
  }

  return (
    <>
      <Label>Edit</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onUndo}>
          Undo ↩️ <Keys keys={[modKey, 'z']} />
        </Link>
        <Link onClick={onRedo}>
          Redo ↪️ <Keys keys={[modKey, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
        </Link>
      </Sub>
    </>
  )
}
