import {createEffect, createSignal, Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {useState} from '@/state'
import * as remote from '@/remote'
import {Keys, Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

export const SubmenuEditor = () => {
  const {editorService, fileService} = useState()
  const [relativePath, setRelativePath] = createSignal('')

  const modKey = isMac ? '⌘' : mod

  const onSaveAs = async () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    try {
      const path = await remote.saveFile(currentFile)
      if (path) await editorService.updatePath(path)
    } catch (_e) {
      remote.info(`Save as cancelled`)
    }
  }

  const onClear = () => editorService.clear()

  createEffect(async () => {
    if (!fileService.currentFile?.path) return
    const rel = await remote.toRelativePath(fileService.currentFile?.path)
    setRelativePath(rel)
  }, fileService.currentFile?.path)

  return (
    <>
      <Label>File {fileService.currentFile?.path && <i>({relativePath()})</i>}</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={isTauri() && !fileService.currentFile?.path}>
          <Link onClick={onSaveAs}>
            <Icon>save_as</Icon> Save to file 💾 <Keys keys={[modKey, 's']} />
          </Link>
        </Show>
        <Link onClick={onClear} data-testid="clear">
          <Icon>clear</Icon> Clear file <Keys keys={[modKey, 'w']} />
        </Link>
      </Sub>
    </>
  )
}
