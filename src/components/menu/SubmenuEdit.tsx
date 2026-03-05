import {Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {copyAllAsMarkdown} from '@/remote/clipboard'
import {useState} from '@/state'
import {IconCopy, IconCut, IconMarkdownCopy, IconPaste, IconRedo, IconUndo} from '../icons/Ui'
import {Link} from './Link'
import {Label, Sub} from './Style'

export const SubmenuEdit = () => {
  const {collabService, fileService, dialogService} = useState()

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
    dialogService.toast({message: 'Copied all content as markdown', duration: 2000})
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
          <IconCut /> Cut
        </Link>
        <Link onClick={() => cmd('paste')} disabled={!isTauri()} keys={[modKey, 'p']}>
          <IconPaste /> Paste
        </Link>
        <Link onClick={() => cmd('copy')} keys={[modKey, 'c']}>
          <IconCopy /> Copy
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
