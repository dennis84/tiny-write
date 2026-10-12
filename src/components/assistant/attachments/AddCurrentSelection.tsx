import {createEffect, createSignal, Show} from 'solid-js'
import {TooltipButton} from '@/components/dialog/Style'
import {IconTextCursor} from '@/components/icons/Ui'
import {useCurrentFile} from '@/hooks/use-current-file'
import {useState} from '@/state'
import {type Attachment, AttachmentType} from '@/types'

interface Props {
  onAttachment: (attachment: Attachment) => void
}

export const AddCurrentSelection = (props: Props) => {
  const {store} = useState()
  const [show, setShow] = createSignal(false)
  const currentFile = useCurrentFile()

  const onClick = async () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    editorView.state.selection.ranges.forEach((range) => {
      const content = editorView.state.sliceDoc(range.from, range.to)

      props.onAttachment({
        content,
        type: AttachmentType.Selection,
        fileId: currentFile()?.id,
        path: currentFile()?.path,
        selection: [range.from, range.to],
      })
    })
  }

  createEffect(() => {
    store.lastTr
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return false
    setShow(!editorView.state.selection.main.empty)
  })

  return (
    <Show when={show()}>
      <TooltipButton onClick={onClick}>
        <IconTextCursor />
        Add selection
      </TooltipButton>
    </Show>
  )
}
