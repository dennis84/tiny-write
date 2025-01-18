import {Show} from 'solid-js'
import {useState} from '@/state'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'
import {createCodeDetails, useCurrentFile} from '../util'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const CurrentFileButton = (props: Props) => {
  const currentFile = useCurrentFile()

  const {fileService} = useState()

  const onClick = async () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    const title = await fileService.getTitle(currentFile())
    const content = createCodeDetails({
      title,
      id: currentFile()?.id,
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
