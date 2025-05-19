import {createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {defaultKeymap} from '@codemirror/commands'
import {markdown} from '@codemirror/lang-markdown'
import {getTheme} from '@/codemirror/theme'
import {onEnterDoubleNewline} from '@/codemirror/key-bindings'
import {Message, useState} from '@/state'
import {IconAttachment, IconSend, IconStop} from '../Icon'
import {Tooltip} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'
import {IconButton} from '../Button'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {ChatInputAction, inputEditor} from './Style'

const ChatInputContainer = styled('div')`
  margin-top: auto;
  padding: 20px 0;
  position: relative;
  justify-self: flex-end;
  scroll-margin-bottom: 50px;
  ${inputEditor}
`

interface Props {
  onMessage: (message: Message) => void
  ref?: HTMLDivElement
}

export const ChatInput = (props: Props) => {
  let chatInputRef!: HTMLDivElement
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [editorView, setEditorView] = createSignal<EditorView>()
  const {configService, copilotService} = useState()

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
  }

  const onAttachmentMenu = (e: MouseEvent) => {
    setTooltipAnchor(e.currentTarget as HTMLElement)
  }

  const onAttachment = (message: Message) => {
    props.onMessage(message)
    closeTooltip()
  }

  const onSend = () => {
    const view = editorView()
    if (!view) return

    const content = view.state.doc.toString().trim()
    if (!content) return

    view.dispatch({
      changes: {from: 0, to: content.length, insert: ''},
    })

    props.onMessage({
      id: uuidv4(),
      role: 'user',
      content,
    })
  }

  const onStop = () => {
    copilotService.stop()
  }

  onMount(() => {
    const theme = getTheme(configService.codeTheme.value)
    const view = new EditorView({
      parent: chatInputRef,
      doc: '',
      extensions: [
        theme,
        markdown(),
        keymap.of([onEnterDoubleNewline(() => onSend())]),
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
      <ChatInputContainer ref={props.ref}>
        <div
          onClick={() => editorView()?.focus()}
          ref={chatInputRef}
          data-testid="chat_input"
        ></div>
        <ChatInputAction style={{ bottom: '20px' }}>
          <TooltipHelp title="Add an attachment to context">
            <IconButton onClick={onAttachmentMenu}>
              <IconAttachment />
            </IconButton>
          </TooltipHelp>
          <Show when={copilotService.streaming()}>
            <TooltipHelp title="Stop">
              <IconButton onClick={onStop}>
                <IconStop />
              </IconButton>
            </TooltipHelp>
          </Show>
          <Show when={!copilotService.streaming()}>
            <TooltipHelp title="Send message">
              <IconButton onClick={onSend} data-testid="send">
                <IconSend />
              </IconButton>
            </TooltipHelp>
          </Show>
        </ChatInputAction>
      </ChatInputContainer>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={() => closeTooltip()} backdrop={true}>
          <CurrentFileButton onAttachment={onAttachment} />
          <SelectionButton onAttachment={onAttachment} />
        </Tooltip>
      </Show>
    </>
  )
}
