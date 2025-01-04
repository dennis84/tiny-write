import {createSignal, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {File, Mode, useState} from '@/state'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {Button} from '@/components/Button'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'

interface TooltipButtonProps {
  onAttachment: (message: ChatInputMessage) => void
}

export const SelectionButton = (props: TooltipButtonProps) => {
  const {store, canvasService, fileService} = useState()

  const getSelectedFile = (): File | undefined => {
    if (store.mode === Mode.Code) return fileService.currentFile
    if (store.mode === Mode.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      if (!elementId) return
      return fileService.findFileById(elementId)
    }
  }

  const hasSelection = (): boolean => !getSelectedFile()?.codeEditorView?.state.selection.main.empty

  const onClick = () => {
    const currentFile = getSelectedFile()
    const editorView = currentFile?.codeEditorView
    if (!editorView) return
    const doc = editorView.state.sliceDoc(
      editorView.state.selection.main.from,
      editorView.state.selection.main.to,
    )
    let content = '```'
    content += currentFile.codeLang ?? ''
    content += currentFile.path ? ' ' + currentFile.path : ''
    content += '\n'
    content += doc
    content += '\n```'
    props.onAttachment({
      content,
      attachment: true,
      render: {
        component: Selection,
        props: {doc, lang: currentFile.codeLang},
      },
    })
  }

  return (
    <Show when={hasSelection()}>
      <div onClick={onClick}>
        <Icon>text_select_start</Icon>
        Add selection
      </div>
    </Show>
  )
}

const Selection = (props: {doc: string; lang?: string}) => {
  let editorRef!: HTMLDivElement
  const [editorView, setEditorView] = createSignal<EditorView>()
  const {configService} = useState()

  const CodeContainer = styled('div')`
    .cm-editor {
      margin-top: 10px;
    }
  `

  const onToggle = () => {
    if (editorView()) {
      editorView()?.destroy()
      setEditorView(undefined)
      return
    }

    const theme = getTheme(configService.codeTheme.value)
    const lang = getLanguageConfig(props.lang ?? '')

    const view = new EditorView({
      parent: editorRef,
      doc: props.doc,
      extensions: [
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
        theme,
        lang.highlight(),
      ],
    })

    setEditorView(view)
  }

  return (
    <div>
      <Button onClick={onToggle}>
        <Icon>text_select_start</Icon> Selection
      </Button>
      <CodeContainer ref={editorRef} />
    </div>
  )
}
