import {defaultKeymap} from '@codemirror/commands'
import {markdown} from '@codemirror/lang-markdown'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {onEnterDoubleNewline} from '@/codemirror/key-bindings'
import {getTheme} from '@/codemirror/theme'
import {type Attachment, type Message, MessageType, useState} from '@/state'
import {IconButton} from '../Button'
import {IconAttachment, IconSend, IconStop} from '../Icon'
import {Tooltip, TooltipDivider} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'
import {AutoContext} from './AutoContext'
import {AutoContextToggle} from './attachments/AutoContextToggle'
import {CurrentFileButton} from './attachments/CurrentFile'
import {ImageButton} from './attachments/Image'
import {SelectionButton} from './attachments/Selection'
import {
  ChatInputAction,
  ChatInputContainer,
  ChatInputEditor,
  ChatInputFieldContainer,
} from './Style'
import {Suggestions} from './Suggestions'

const Attachments = styled('div')`
  display: flex;
  min-width: 0;
  gap: 5px;
  justify-content: flex-end;
`

const EmptyContainer = styled('div')`
  width: 100%;
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
`

interface Props {
  onMessage: (message: Message) => void
  ref?: HTMLDivElement
  dropArea?: () => HTMLElement
}

export const ChatInput = (props: Props) => {
  let chatInputRef!: HTMLDivElement
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [editorView, setEditorView] = createSignal<EditorView>()
  const [focused, setFocused] = createSignal(false)

  const {store, configService, copilotService, threadService, mediaService} = useState()

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
  }

  const onAttachmentMenu = (e: MouseEvent) => {
    setTooltipAnchor(e.currentTarget as HTMLElement)
  }

  const onAttachment = (attachment: Attachment) => {
    threadService.addAttachment(attachment)
    closeTooltip()
  }

  const onImageAttachment = () => {
    closeTooltip()
    editorView()?.focus()
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
      attachments: threadService.attachments(),
    })

    mediaService.resetDroppedFiles()
    threadService.setAttachments([])
  }

  const onSendSuggestion = (content: string) => {
    props.onMessage({
      id: uuidv4(),
      role: 'user',
      content,
      attachments: threadService.attachments(),
    })

    mediaService.resetDroppedFiles()
    threadService.setAttachments([])
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
        // n focus hook
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
    <>
      <Show when={!threadService.messageTree.rootItemIds.length}>
        <EmptyContainer>
          <Show when={!store.ai?.autoContext}>
            <CurrentFileButton onAttachment={onAttachment} />
            <SelectionButton onAttachment={onAttachment} />
            <TooltipDivider />
          </Show>
          <AutoContextToggle />
        </EmptyContainer>
      </Show>
      <ChatInputContainer ref={props.ref} focused={focused()}>
        <ChatInputFieldContainer>
          <ChatInputEditor
            role="none"
            onClick={() => editorView()?.focus()}
            ref={chatInputRef}
            data-testid="chat_input"
          ></ChatInputEditor>
          <ChatInputAction>
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
        </ChatInputFieldContainer>
        <Attachments>
          <AutoContext />
        </Attachments>
      </ChatInputContainer>
      <Show
        when={threadService.attachments().some(
          (a) => a.type === MessageType.File || a.type === MessageType.Selection,
        )}
      >
        <Suggestions onSuggestion={onSendSuggestion} />
      </Show>
      <Show when={tooltipAnchor()}>
        {(a) => (
          <Tooltip anchor={a()} onClose={() => closeTooltip()} backdrop={true}>
            <CurrentFileButton onAttachment={onAttachment} />
            <SelectionButton onAttachment={onAttachment} />
            <ImageButton onAttachment={onImageAttachment} />
          </Tooltip>
        )}
      </Show>
    </>
  )
}
