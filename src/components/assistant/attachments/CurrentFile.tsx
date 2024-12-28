import {createSignal, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {useState} from '@/state'
import {highlight} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {Button} from '@/components/Button'
import {Icon} from '@/components/Icon'
import {ChatInputMessage} from '../ChatInput'

interface TooltipButtonProps {
  onAttachment: (message: ChatInputMessage) => void
}

export const CurrentFileButton = (props: TooltipButtonProps) => {
  const {fileService} = useState()

  const isCode = () => {
    const currentFile = fileService.currentFile
    return currentFile?.code ?? false
  }

  const onClick = () => {
    const currentFile = fileService.currentFile
    const editorView = currentFile?.codeEditorView
    if (!editorView) return
    const doc = editorView.state.doc.toString()
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
        component: CurrentFile,
        props: {doc, lang: currentFile.codeLang},
      },
    })
  }

  return (
    <Show when={isCode()}>
      <div onClick={onClick}>
        <Icon>code_blocks</Icon>
        Add current file
      </div>
    </Show>
  )
}

export const CurrentFile = (props: {doc: string; lang?: string}) => {
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
    const langSupport = highlight(props.lang ?? '')

    const view = new EditorView({
      parent: editorRef,
      doc: props.doc,
      extensions: [
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
        theme,
        ...(langSupport ? [langSupport] : []),
      ],
    })

    setEditorView(view)
  }

  return (
    <div>
      <Button onClick={onToggle}>
        <Icon>code_blocks</Icon> Current File
      </Button>
      <CodeContainer ref={editorRef} />
    </div>
  )
}
