import {Show} from 'solid-js'
import {v4 as uuidv4} from 'uuid'
import {useState} from '@/state'
import {IconCodeBlocks} from '@/components/Icon'
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
      id: uuidv4(),
      role: 'user',
      content,
      attachment: true,
    })
  }

  return (
    <Show when={currentFile()?.code}>
      <div onClick={onClick}>
        <IconCodeBlocks />
        Add current file
      </div>
    </Show>
  )
}
