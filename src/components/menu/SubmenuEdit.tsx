import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {useState} from '@/state'
import * as remote from '@/remote'
import {isMac, isTauri, mod} from '@/env'
import {Keys, Label, Link, Sub} from './Menu'

export const SubmenuEdit = () => {
  const [, ctrl] = useState()
  const [lastAction, setLastAction] = createSignal<string | undefined>()

  const modKey = isMac ? '⌘' : mod

  const onUndo = () => {
    ctrl.collab.undoManager?.undo()
  }

  const onRedo = () => {
    ctrl.collab.undoManager?.redo()
  }

  const cmd = (cmd: string) => {
    (document as any).execCommand(cmd)
    setLastAction(cmd)
  }

  const onCopyAllAsMd = async () => {
    const currentFile = ctrl.file.currentFile
    const state = currentFile?.editorView?.state
    if (!state) return
    await remote.copyAllAsMarkdown(state)
    setLastAction('copy-md')
  }

  createEffect(() => {
    if (!lastAction()) return
    const id = setTimeout(() => {
      setLastAction(undefined)
    }, 1000)
    onCleanup(() => clearTimeout(id))
  })

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
        <Link onClick={() => cmd('cut')}>
          Cut <Keys keys={[modKey, 'x']} />
        </Link>
        <Link onClick={() => cmd('paste')} disabled={!isTauri()}>
          Paste <Keys keys={[modKey, 'p']} />
        </Link>
        <Link onClick={() => cmd('copy')}>
          Copy {lastAction() === 'copy' && '📋'} <Keys keys={[modKey, 'c']} />
        </Link>
        <Show when={ctrl.file.currentFile?.editorView}>
          <Link onClick={onCopyAllAsMd}>
            Copy all as markdown {lastAction() === 'copy-md' && '📋'}
          </Link>
        </Show>
      </Sub>
    </>
  )
}
