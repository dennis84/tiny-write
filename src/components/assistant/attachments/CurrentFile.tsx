import {Show} from 'solid-js'
import {File, Mode, useState} from '@/state'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const useCurrentFile = (): File | undefined => {
  const {store, canvasService, fileService} = useState()
  if (store.mode === Mode.Code) return fileService.currentFile
  if (store.mode === Mode.Canvas) {
    const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
    if (!elementId) return
    return fileService.findFileById(elementId)
  }
}

interface CodeDetails {
  code: string
  title: string
  lang?: string
  path?: string
}

export const createCodeDetails = (props: CodeDetails) => {
  let content = ''
  content += `::: details ${props.title}\n`
  content += '```'
  content += props.lang ?? ''
  content += props.path ? ' ' + props.path : ''
  content += '\n'
  content += props.code
  content += '\n```\n'
  content += ':::'
  return content
}

export const CurrentFileButton = (props: Props) => {
  const currentFile = useCurrentFile()

  const isCodeFile = (): boolean => currentFile?.code ?? false

  const onClick = () => {
    const editorView = currentFile?.codeEditorView
    if (!editorView) return
    const content = createCodeDetails({
      title: 'Current File',
      code: editorView.state.doc.toString(),
      lang: currentFile.codeLang,
      path: currentFile.path,
    })

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
