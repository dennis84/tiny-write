import {Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {saveFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {IconClose, IconSaveAs} from '../icons/Ui'
import {Link} from './Link'
import {Label, Sub} from './Style'

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
          <Link onClick={onSaveAs} keys={[modKey, 's']}>
            <IconSaveAs /> Save to file
          </Link>
        </Show>
        <Link onClick={onClear} keys={[modKey, 'w']} data-testid="clear">
          <IconClose /> Clear file
        </Link>
      </Sub>
    </>
  )
}
