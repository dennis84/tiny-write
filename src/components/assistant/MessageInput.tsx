import {defaultKeymap} from '@codemirror/commands'
import {markdown} from '@codemirror/lang-markdown'
import {EditorView, keymap} from '@codemirror/view'
import {createSignal, onMount} from 'solid-js'
import {onEnterDoubleNewline} from '@/codemirror/key-bindings'
import {getTheme} from '@/codemirror/theme'
import {type Message, useState} from '@/state'
import {IconButton} from '../Button'
import {IconCheck, IconClose} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {
  ChatInputAction,
  ChatInputContainer,
  ChatInputEditor,
  ChatInputFieldContainer,
} from './Style'

interface Props {
  onUpdate: (message: Message) => void
  onCancel: () => void
  message: Message
}

export const MessageInput = (props: Props) => {
  let chatInputRef!: HTMLDivElement
  const [editorView, setEditorView] = createSignal<EditorView>()
  const [focused, setFocused] = createSignal(false)
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
        EditorView.focusChangeEffect.of((_, focusing) => {
          setFocused(focusing)
          return null
        }),
      ],
    })

    setEditorView(view)

    // Hight is not set correctly without timeout
    setTimeout(() => view.focus(), 50)
  })

  return (
    <ChatInputContainer data-testid="message_input" focused={focused()}>
      <ChatInputFieldContainer>
        <ChatInputEditor ref={chatInputRef} />
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
      </ChatInputFieldContainer>
    </ChatInputContainer>
  )
}
