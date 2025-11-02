import {Show} from 'solid-js'
import {IconCodeBlocks} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {useCurrentFile} from '@/hooks/current-file'
import {type Attachment, AttachmentType} from '@/state'
import {createCodeFence} from '../util'

interface Props {
  onAttachment: (attachment: Attachment) => void
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
      content,
      type: AttachmentType.File,
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
