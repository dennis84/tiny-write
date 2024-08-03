import {createSignal} from 'solid-js'
import {useState} from '@/state'
import {Label, Link, Sub} from './Menu'
import {InputLine, InputLineConfig} from '../dialog/InputLine'
import {Icon} from '../Icon'

export const SubmenuCode = () => {
  const [, ctrl] = useState()

  const [inputLine, setInputLine] = createSignal<InputLineConfig>()

  const onChangeLang = () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile) return
    const language = currentFile.codeEditorView?.contentDOM.dataset.language ?? ''

    setInputLine({
      value: language,
      onEnter: (lang) => {
        ctrl.code.updateLang(currentFile, lang)
      }
    })
  }

  return (
    <>
      <Label>Code</Label>
      <Sub data-tauri-drag-region="true">
        <Link onClick={onChangeLang}><Icon>javascript</Icon> Change language</Link>
      </Sub>
      <InputLine getter={inputLine} setter={setInputLine} />
    </>
  )
}
