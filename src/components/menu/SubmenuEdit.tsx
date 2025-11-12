import {Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {copyAllAsMarkdown} from '@/remote/clipboard'
import {useState} from '@/state'
import {
  IconContentCopy,
  IconContentCut,
  IconContentPaste,
  IconMarkdownCopy,
  IconRedo,
  IconUndo,
} from '../Icon'
import {Link} from './Link'
import {Label, Sub} from './Style'

export const SubmenuEdit = () => {
  const {collabService, fileService, toastService} = useState()

  const modKey = isMac ? '⌘' : mod

  const onUndo = () => {
    collabService.undoManager?.undo()
  }

  const onRedo = () => {
    collabService.undoManager?.redo()
  }

  const cmd = (cmd: string) => {
    ;(document as any).execCommand(cmd)
  }

  const onCopyAllAsMd = async () => {
    const currentFile = fileService.currentFile
    const state = currentFile?.editorView?.state
    if (!state) return
    await copyAllAsMarkdown(state)
    toastService.open({message: 'Copied all content as markdown', duration: 2000})
  }

  return (
    <>
      <Label>Edit</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onUndo} keys={[modKey, 'z']}>
          <IconUndo /> Undo
        </Link>
        <Link onClick={onRedo} keys={[modKey, ...(isMac ? ['Shift', 'z'] : ['y'])]}>
          <IconRedo /> Redo
        </Link>
        <Link onClick={() => cmd('cut')} keys={[modKey, 'x']}>
          <IconContentCut /> Cut
        </Link>
        <Link onClick={() => cmd('paste')} disabled={!isTauri()} keys={[modKey, 'p']}>
          <IconContentPaste /> Paste
        </Link>
        <Link onClick={() => cmd('copy')} keys={[modKey, 'c']}>
          <IconContentCopy /> Copy
        </Link>
        <Show when={fileService.currentFile?.editorView}>
          <Link onClick={onCopyAllAsMd}>
            <IconMarkdownCopy /> Copy all as markdown
          </Link>
        </Show>
      </Sub>
    </>
  )
}
