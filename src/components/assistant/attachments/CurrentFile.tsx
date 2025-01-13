import {Show} from 'solid-js'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'
import {createCodeDetails, useCurrentFile} from '../util'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const CurrentFileButton = (props: Props) => {
  const currentFile = useCurrentFile()

  const onClick = () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return
    const content = createCodeDetails({
      title: 'Current File',
      code: editorView.state.doc.toString(),
      lang: currentFile()?.codeLang,
      path: currentFile()?.path,
    })

    props.onAttachment({
      content,
      attachment: true,
    })
  }

  return (
    <Show when={currentFile()?.code}>
      <div onClick={onClick}>
        <Icon>code_blocks</Icon>
        Add current file
      </div>
    </Show>
  )
}
