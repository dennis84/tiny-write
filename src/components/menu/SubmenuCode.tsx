import {Show} from 'solid-js'
import {getLanguageNames} from '@/codemirror/highlight'
import {isMac, isTauri, mod} from '@/env'
import {useInputLine} from '@/hooks/use-input-line'
import {saveFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {IconSaveAs} from '../icons/File'
import {IconLanguage} from '../icons/Ui'
import {Link} from './Link'
import {Label, Sub} from './Style'

export const SubmenuCode = () => {
  const {codeService, fileService} = useState()
  const showInputLine = useInputLine()

  const modKey = isMac ? '⌘' : mod

  const onChangeLang = () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    showInputLine({
      value: currentFile.codeLang ?? '',
      words: getLanguageNames(),
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
          <IconLanguage /> Change language
        </Link>
        <Show when={isTauri() && !fileService.currentFile?.path}>
          <Link onClick={onSaveAs} keys={[modKey, 's']}>
            <IconSaveAs /> Save to file
          </Link>
        </Show>
      </Sub>
    </>
  )
}
