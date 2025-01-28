import {createEffect, createSignal, Show} from 'solid-js'
import {v4 as uuidv4} from 'uuid'
import {useState} from '@/state'
import {IconTextSelectStart} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'
import {createCodeDetails, useCurrentFile} from '../util'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const SelectionButton = (props: Props) => {
  const {store, fileService} = useState()
  const [show, setShow] = createSignal(false)
  const currentFile = useCurrentFile()

  const onClick = async () => {
    const editorView = currentFile()?.codeEditorView
    if (!editorView) return

    const from = editorView.state.selection.main.from
    const to = editorView.state.selection.main.to
    const code = editorView.state.sliceDoc(from, to)
    let title = await fileService.getTitle(currentFile())
    title = `${title}:${from}-${to}`

    const content = createCodeDetails({
      title,
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
        <IconTextSelectStart />
        Add selection
      </div>
    </Show>
  )
}
