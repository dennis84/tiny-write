import {defaultKeymap} from '@codemirror/commands'
import {markdown} from '@codemirror/lang-markdown'
import {EditorView, keymap} from '@codemirror/view'
import {createSignal, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {onEnterDoubleNewline} from '@/codemirror/key-bindings'
import {getTheme} from '@/codemirror/theme'
import {type Message, useState} from '@/state'
import {IconButton} from '../Button'
import {IconCheck, IconClose} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {ChatInputAction, inputEditor} from './Style'

const MessageInputContainer = styled('div')`
  margin-top: 20px;
  position: relative;
  ${inputEditor}
`

interface Props {
  onUpdate: (message: Message) => void
  onCancel: () => void
  message: Message
}

export const MessageInput = (props: Props) => {
  let chatInputRef!: HTMLDivElement
  const [editorView, setEditorView] = createSignal<EditorView>()
  const {configService} = useState()

  const onUpdate = () => {
    const view = editorView()
    if (!view) return

    const content = view.state.doc.toString()
    if (!content) return

    view.dispatch({
      changes: {from: 0, to: content.length, insert: ''},
    })

    props.onUpdate({...props.message, content})
  }

  const onCancel = () => {
    const view = editorView()
    if (!view) return
    const content = view.state.doc.toString()
    props.onCancel()
    view.dispatch({
      changes: {from: 0, to: content.length, insert: ''},
    })
  }

  onMount(() => {
    const theme = getTheme(configService.codeTheme.value)
    const view = new EditorView({
      parent: chatInputRef,
      doc: props.message?.content ?? '',
      extensions: [
        theme,
        markdown(),
        keymap.of([onEnterDoubleNewline(() => onUpdate())]),
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
      ],
    })

    setEditorView(view)

    // Hight is not set correctly without timeout
    setTimeout(() => view.focus(), 50)
  })

  return (
    <MessageInputContainer data-testid="message_input">
      <div ref={chatInputRef}></div>
      <ChatInputAction>
        <TooltipHelp title="Cancel">
          <IconButton onClick={onCancel}>
            <IconClose />
          </IconButton>
        </TooltipHelp>
        <TooltipHelp title="Update message">
          <IconButton onClick={onUpdate} data-testid="update_message">
            <IconCheck />
          </IconButton>
        </TooltipHelp>
      </ChatInputAction>
    </MessageInputContainer>
  )
}
