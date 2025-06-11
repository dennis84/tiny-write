import {createSignal, For, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {defaultKeymap} from '@codemirror/commands'
import {markdown} from '@codemirror/lang-markdown'
import {getTheme} from '@/codemirror/theme'
import {onEnterDoubleNewline} from '@/codemirror/key-bindings'
import {type Attachment, type Message, useState} from '@/state'
import {IconAttachment, IconSend, IconStop} from '../Icon'
import {Tooltip} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'
import {IconButton} from '../Button'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {ImageButton} from './attachments/Image'
import {ChatInputAction, inputEditor} from './Style'
import {DropAttachment} from './DropAttachement'

const ChatInputContainer = styled('div')`
  margin-top: auto;
  padding: 20px 0;
  position: relative;
  justify-self: flex-end;
  scroll-margin-bottom: 50px;
  ${inputEditor}
`

const Attachments = styled('span')`
  display: flex;
  min-width: 0;
  justify-content: flex-end;
`

const AttachmentChip = styled('span')`
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  border-radius: 30px;
  padding: 0 20px;
  line-height: 40px;
  display: block;
  background: var(--background-60);
  color: var(--foreground);
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
  justify-content: flex-start;
  text-overflow: ellipsis;
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
  const {configService, copilotService} = useState()
  const [attachments, setAttachments] = createSignal<Attachment[]>([])

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

  const onImageAttachment = (images: Attachment[]) => {
    closeTooltip()
    setAttachments(images)
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
      attachments: attachments(),
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
      <DropAttachment dropArea={props.dropArea} onDrop={onImageAttachment} />
      <ChatInputContainer ref={props.ref}>
        <div
          onClick={() => editorView()?.focus()}
          ref={chatInputRef}
          data-testid="chat_input"
        ></div>
        <ChatInputAction style={{bottom: '20px'}}>
          <Show when={attachments().length}>
            <Attachments>
              <For each={attachments()}>
                {(attachment) => <AttachmentChip>{attachment.name}</AttachmentChip>}
              </For>
            </Attachments>
          </Show>
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
          <ImageButton onAttachment={onImageAttachment} />
        </Tooltip>
      </Show>
    </>
  )
}
