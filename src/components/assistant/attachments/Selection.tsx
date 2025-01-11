import {createEffect, createSignal, Show} from 'solid-js'
import {useState} from '@/state'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'
import {createCodeDetails, useCurrentFile} from './CurrentFile'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const SelectionButton = (props: Props) => {
  const {store} = useState()
  const [show, setShow] = createSignal(false)
  const currentFile = useCurrentFile()

  const onClick = () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    const code = editorView.state.sliceDoc(
      editorView.state.selection.main.from,
      editorView.state.selection.main.to,
    )

    const content = createCodeDetails({
      title: 'Selection',
      code,
      lang: currentFile()?.codeLang,
      path: currentFile()?.path,
    })

    props.onAttachment({
      content,
      attachment: true,
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
      <div onClick={onClick}>
        <Icon>text_select_start</Icon>
        Add selection
      </div>
    </Show>
  )
}
