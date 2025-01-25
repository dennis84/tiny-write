import {Show} from 'solid-js'
import {isMac, isTauri, mod} from '@/env'
import {useState} from '@/state'
import {saveFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {languages} from '@/codemirror/highlight'
import {Keys, Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

export const SubmenuCode = () => {
  const {appService, codeService, fileService} = useState()

  const modKey = isMac ? '⌘' : mod

  const onChangeLang = () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return

    appService.setInputLine({
      value: currentFile.codeLang ?? '',
      words: Object.keys(languages),
      onEnter: (lang) => {
        codeService.updateLang(currentFile, lang)
      },
    })
  }

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

  return (
    <>
      <Label>Code</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onChangeLang}>
          <Icon>javascript</Icon> Change language
        </Link>
        <Show when={isTauri() && !fileService.currentFile?.path}>
          <Link onClick={onSaveAs}>
            <Icon>save_as</Icon> Save to file <Keys keys={[modKey, 's']} />
          </Link>
        </Show>
      </Sub>
    </>
  )
}
