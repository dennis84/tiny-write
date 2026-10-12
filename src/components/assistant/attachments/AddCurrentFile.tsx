import {Show} from 'solid-js'
import {TooltipButton} from '@/components/dialog/Style'
import {IconCodeBlocks} from '@/components/icons/File'
import {useCurrentFile} from '@/hooks/use-current-file'
import {type Attachment, AttachmentType} from '@/types'

interface Props {
  onAttachment: (attachment: Attachment) => void
}

export const AddCurrentFile = (props: Props) => {
  const currentFile = useCurrentFile()

  const onClick = () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    props.onAttachment({
      content: editorView.state.doc.toString(),
      type: AttachmentType.File,
      fileId: currentFile()?.id,
      codeLang: currentFile()?.codeLang,
      path: currentFile()?.path,
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
