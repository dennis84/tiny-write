import {createEffect, createSignal, Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {useState} from '@/state'
import * as remote from '@/remote'
import {Keys, Label, Link, Sub} from './Menu'

export const SubmenuFile = ({maybeHide}: {maybeHide: () => void}) => {
  const [, ctrl] = useState()
  const [relativePath, setRelativePath] = createSignal('')

  const modKey = isMac ? '⌘' : mod

  const onNew = async () => {
    const currentFile = ctrl.file.currentFile
    await ctrl.editor.newFile()
    ctrl.tree.create()
    maybeHide()
    currentFile?.editorView?.focus()
  }

  const onSaveAs = async () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile) return
    const path = await remote.saveFile(currentFile)
    if (path) await ctrl.editor.updatePath(path)
  }

  const onClear = () => ctrl.editor.clear()

  createEffect(async () => {
    if (!ctrl.file.currentFile?.path) return
    const rel = await remote.toRelativePath(ctrl.file.currentFile?.path)
    setRelativePath(rel)
  }, ctrl.file.currentFile?.path)

  return (
    <>
      <Label>
        File {ctrl.file.currentFile?.path && <i>({relativePath()})</i>}
      </Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onNew} data-testid="new_file">
          New file 🆕 <Keys keys={[modKey, 'n']} />
        </Link>
        <Show when={isTauri() && !ctrl.file.currentFile?.path}>
          <Link onClick={onSaveAs}>
            Save to file 💾 <Keys keys={[modKey, 's']} />
          </Link>
        </Show>
        <Link
          onClick={onClear}
          data-testid="clear">
          Clear file 🧽 <Keys keys={[modKey, 'w']} />
        </Link>
      </Sub>
    </>
  )
}
