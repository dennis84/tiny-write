import {Show} from 'solid-js'
import {v4 as uuidv4} from 'uuid'
import {Message, MessageType} from '@/state'
import {useCurrentFile} from '@/hooks/current-file'
import {IconCodeBlocks} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {createCodeFence} from '../util'

interface Props {
  onAttachment: (message: Message) => void
}

export const CurrentFileButton = (props: Props) => {
  const currentFile = useCurrentFile()

  const onClick = () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    const content = createCodeFence({
      id: currentFile()?.id,
      code: editorView.state.doc.toString(),
      lang: currentFile()?.codeLang,
      path: currentFile()?.path,
    })

    props.onAttachment({
      id: uuidv4(),
      role: 'user',
      content,
      type: MessageType.File,
      fileId: currentFile()?.id,
    })
  }

  return (
    <Show when={currentFile()?.code}>
      <TooltipButton onClick={onClick}>
        <IconCodeBlocks />
        Add current file
      </TooltipButton>
    </Show>
  )
}
