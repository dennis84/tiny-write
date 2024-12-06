import {Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {useState} from '@/state'
import {saveFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {Keys, Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

export const SubmenuEditor = () => {
  const {editorService, fileService} = useState()

  const modKey = isMac ? '⌘' : mod

  const onSaveAs = async () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    try {
      const path = await saveFile(currentFile)
      if (path) await fileService.updatePath(currentFile.id, path)
    } catch (e) {
      info(`Save as cancelled`, e)
    }
  }

  const onClear = () => editorService.clear()

  return (
    <>
      <Label>File</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={isTauri() && !fileService.currentFile?.path}>
          <Link onClick={onSaveAs}>
            <Icon>save_as</Icon> Save to file <Keys keys={[modKey, 's']} />
          </Link>
        </Show>
        <Link onClick={onClear} data-testid="clear">
          <Icon>clear</Icon> Clear file <Keys keys={[modKey, 'w']} />
        </Link>
      </Sub>
    </>
  )
}
