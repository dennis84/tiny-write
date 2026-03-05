import {createEffect, createSignal, Show} from 'solid-js'
import {TooltipButton} from '@/components/dialog/Style'
import {IconTextCursor} from '@/components/icons/Ui'
import {useCurrentFile} from '@/hooks/use-current-file'
import {useState} from '@/state'
import {type Attachment, AttachmentType} from '@/types'
import {createCodeFence} from '../util'

interface Props {
  onAttachment: (attachment: Attachment) => void
}

export const SelectionButton = (props: Props) => {
  const {store} = useState()
  const [show, setShow] = createSignal(false)
  const currentFile = useCurrentFile()

  const onClick = async () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    const from = editorView.state.selection.main.from
    const to = editorView.state.selection.main.to
    const code = editorView.state.sliceDoc(from, to)

    const content = createCodeFence({
      id: currentFile()?.id,
      code,
      lang: currentFile()?.codeLang,
      path: currentFile()?.path,
      range: [from, to],
    })

    props.onAttachment({
      content,
      type: AttachmentType.Selection,
      fileId: currentFile()?.id,
      selection: [from, to],
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
