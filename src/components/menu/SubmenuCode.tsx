import {useState} from '@/state'
import {Label, Link, Sub} from './Style'
import {Icon} from '../Icon'

export const SubmenuCode = () => {
  const [, ctrl] = useState()

  const onChangeLang = () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile) return
    const language = currentFile.codeEditorView?.contentDOM.dataset.language ?? ''

    ctrl.app.setInputLine({
      value: language,
      onEnter: (lang) => {
        ctrl.code.updateLang(currentFile, lang)
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
