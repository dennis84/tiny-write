import {createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {defaultKeymap} from '@codemirror/commands'
import {markdown} from '@codemirror/lang-markdown'
import {getTheme} from '@/codemirror/theme'
import {Message, useState} from '@/state'
import {IconAttachment, IconSend} from '../Icon'
import {Tooltip} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'
import {IconButton} from '../Button'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {ChatInputAction, ChatInputContainer} from './Style'

const Container = styled('div')`
  margin-top: 20px;
`

export interface ChatInputMessage extends Message {
  attachment: boolean
}

interface Props {
  onMessage: (message: ChatInputMessage) => void
  onCancel: () => void
  ref?: HTMLDivElement
}

export const ChatInput = (props: Props) => {
  let chatInputRef!: HTMLDivElement
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [editorView, setEditorView] = createSignal<EditorView>()
  const {configService} = useState()

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
  }

  const onAttachmentMenu = (e: MouseEvent) => {
    setTooltipAnchor(e.target as HTMLElement)
  }

  const onAttachment = (message: ChatInputMessage) => {
    props.onMessage(message)
    closeTooltip()
  }

  const onSend = () => {
    const view = editorView()
    if (!view) return

    const content = view.state.doc.toString()
    if (!content) return

    view.dispatch({
      changes: {from: 0, to: content.length, insert: ''},
    })

    props.onMessage({
      attachment: false,
      id: uuidv4(),
      role: 'user',
      content,
    })
  }

  onMount(() => {
    const theme = getTheme(configService.codeTheme.value)
    const view = new EditorView({
      parent: chatInputRef,
      doc: '',
      extensions: [
        theme,
        markdown(),
        keymap.of([
          {
            key: 'Enter',
            run: (editorView) => {
              const selection = editorView.state.selection.main
              if (!selection.empty) return true
              if (selection.from === editorView.state.doc.length) {
                onSend()
                return true
              }

              return false
            },
          },
        ]),
        placeholder('Ask Copilot'),
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
      ],
    })

    setEditorView(view)

    // Hight is not set correctly without timeout
    setTimeout(() => view.focus(), 50)
  })

  return (
    <>
      <Container>
        <ChatInputContainer ref={props.ref}>
          <div onClick={() => editorView()?.focus()} ref={chatInputRef}></div>
          <ChatInputAction>
            <TooltipHelp title="Add an attachment to context">
              <IconButton onClick={onAttachmentMenu}>
                <IconAttachment />
              </IconButton>
            </TooltipHelp>
            <TooltipHelp title="Send message">
              <IconButton onClick={onSend}>
                <IconSend />
              </IconButton>
            </TooltipHelp>
          </ChatInputAction>
        </ChatInputContainer>
      </Container>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={() => closeTooltip()} backdrop={true}>
          <CurrentFileButton onAttachment={onAttachment} />
          <SelectionButton onAttachment={onAttachment} />
        </Tooltip>
      </Show>
    </>
  )
}
