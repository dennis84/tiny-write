import {createEffect, createSignal, Show} from 'solid-js'
import {v4 as uuidv4} from 'uuid'
import {Message, MessageType, useState} from '@/state'
import {IconTextSelectStart} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {createCodeFence, useCurrentFile} from '../util'

interface Props {
  onAttachment: (message: Message) => void
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
      id: uuidv4(),
      role: 'user',
      content,
      type: MessageType.Selection,
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
        <IconTextSelectStart />
        Add selection
      </TooltipButton>
    </Show>
  )
}
