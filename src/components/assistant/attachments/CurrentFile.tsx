import {Show} from 'solid-js'
import {File, Mode, useState} from '@/state'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const CurrentFileButton = (props: Props) => {
  const {store, canvasService, fileService} = useState()

  const getSelectedFile = (): File | undefined => {
    if (store.mode === Mode.Code) return fileService.currentFile
    if (store.mode === Mode.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      if (!elementId) return
      return fileService.findFileById(elementId)
    }
  }

  const isCodeFile = (): boolean => getSelectedFile()?.code ?? false

  const onClick = () => {
    const currentFile = getSelectedFile()
    const editorView = currentFile?.codeEditorView
    if (!editorView) return
    const doc = editorView.state.doc.toString()
    let content = ''
    content += '::: details Current File\n'
    content += '```'
    content += currentFile.codeLang ?? ''
    content += currentFile.path ? ' ' + currentFile.path : ''
    content += '\n'
    content += doc
    content += '\n```\n'
    content += ':::'
    props.onAttachment({
      content,
      attachment: true,
    })
  }

  return (
    <Show when={isCodeFile()}>
      <div onClick={onClick}>
        <Icon>code_blocks</Icon>
        Add current file
      </div>
    </Show>
  )
}
