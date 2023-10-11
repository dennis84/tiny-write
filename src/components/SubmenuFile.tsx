import {createEffect, createSignal, Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {useState} from '@/state'
import * as remote from '@/remote'
import {isEmpty} from '@/prosemirror'
import {Keys, Label, Link, Sub} from './Menu'

export default ({maybeHide}: {maybeHide: () => void}) => {
  const [store, ctrl] = useState()
  const [relativePath, setRelativePath] = createSignal('')
  const [isTextEmpty, setIsTextEmpty] = createSignal(false)

  const modKey = isMac ? '⌘' : mod

  const clearText = () => {
    if (ctrl.file.currentFile?.path || store.collab?.started) {
      return 'Close ⚠️'
    }
    if (store.files.length > 0 && isTextEmpty()) {
      return 'Discard ⚠️'
    }
    return 'Clear 🧽'
  }

  const clearEnabled = () =>
    ctrl.file.currentFile?.path || ctrl.file.currentFile?.id || store.files.length > 0 || !isTextEmpty()

  const onNew = () => {
    const currentFile = ctrl.file.currentFile
    ctrl.editor.newFile()
    maybeHide()
    currentFile?.editorView?.focus()
  }

  const onSaveAs = async () => {
    const currentFile = ctrl.file.currentFile
    const state = currentFile?.editorView?.state
    if (!state) return
    const path = await remote.save(state)
    if (path) ctrl.editor.updatePath(path)
  }

  const onDiscard = async () => {
    const res = await ctrl.editor.discard()
    if (res) maybeHide()
  }

  const onToggleMarkdown = () => ctrl.editor.toggleMarkdown()

  createEffect(() => {
    ctrl.file.currentFile?.lastModified
    store.collab?.rendered
    const currentFile = ctrl.file.currentFile
    setIsTextEmpty(isEmpty(currentFile?.editorView?.state) ?? true)
  })

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
          onClick={onDiscard}
          disabled={!clearEnabled()}
          data-testid="discard">
          {clearText()} <Keys keys={[modKey, 'w']} />
        </Link>
        <Link onClick={onToggleMarkdown} data-testid="markdown">
          Markdown mode {ctrl.file.currentFile?.markdown && '✅'}
        </Link>
      </Sub>
    </>
  )
}
