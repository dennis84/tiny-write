import {createEffect, createSignal, Show} from 'solid-js'
import {File, Mode, useState} from '@/state'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'

interface Props {
  onAttachment: (message: ChatInputMessage) => void
}

export const SelectionButton = (props: Props) => {
  const {store, canvasService, fileService} = useState()
  const [show, setShow] = createSignal(false)

  const getSelectedFile = (): File | undefined => {
    if (store.mode === Mode.Code) return fileService.currentFile
    if (store.mode === Mode.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      if (!elementId) return
      return fileService.findFileById(elementId)
    }
  }

  const onClick = () => {
    const currentFile = getSelectedFile()
    const editorView = currentFile?.codeEditorView
    if (!editorView) return
    const doc = editorView.state.sliceDoc(
      editorView.state.selection.main.from,
      editorView.state.selection.main.to,
    )
    let content = ''
    content += '::: details Selection\n'
    content += '```'
    content += currentFile.codeLang ?? ''
    content += currentFile.path ? ' ' + currentFile.path : ''
    content += '\n'
    content += doc
    content += '\n```\n'
    content += ':::'
    props.onAttachment({
      content,
      attachment: true,
    })
  }

  createEffect(() => {
    store.lastTr
    const editorView = getSelectedFile()?.codeEditorView
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
