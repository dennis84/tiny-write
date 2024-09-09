import {useState} from '@/state'
import {Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

export const SubmenuCode = () => {
  const {appService, codeService, fileService} = useState()

  const onChangeLang = () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    const language = currentFile.codeEditorView?.contentDOM.dataset.language ?? ''

    appService.setInputLine({
      value: language,
      onEnter: (lang) => {
        codeService.updateLang(currentFile, lang)
      },
    })
  }

  return (
    <>
      <Label>Code</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onChangeLang}>
          <Icon>javascript</Icon> Change language
        </Link>
      </Sub>
    </>
  )
}
