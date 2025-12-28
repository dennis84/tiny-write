import type {EditorView} from 'prosemirror-view'
// import {EditorView, keymap, placeholder} from '@codemirror/view'
import {createSignal, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {serialize} from '@/prosemirror/markdown-serialize'
import {type Attachment, type Message, useState} from '@/state'
import {IconButton} from '../Button'
import {IconAttachment, IconSend, IconStop} from '../Icon'
import {Tooltip, TooltipDivider} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'
import {AutoContextToggle} from './attachments/AutoContextToggle'
import {CurrentFileButton} from './attachments/CurrentFile'
import {ImageButton} from './attachments/Image'
import {SelectionButton} from './attachments/Selection'
import {ChatEditor} from './ChatEditor'
import {ChatInputAttachments} from './ChatInputAttachments'
import {ChatInputAction, ChatInputBorder, ChatInputContainer, ChatInputEditorRow} from './Style'
import {Suggestions} from './Suggestions'

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
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [focused, setFocused] = createSignal(false)
  const [editorView, setEditorView] = createSignal<EditorView>()

  const {store, copilotService, threadService, mediaService} = useState()

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
  }

  const onSend = () => {
    const view = editorView()
    if (!view) return

    const content = serialize(view.state)
    if (!content) return

    const tr = view.state.tr
    tr.delete(0, view.state.doc.content.size)
    view.dispatch(tr)

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
      <ChatInputContainer>
        <ChatInputBorder ref={props.ref} focused={focused()}>
          <ChatInputEditorRow>
            <ChatEditor
              setEditorView={(view) => setEditorView(view)}
              onSubmit={onSend}
              onFocus={(focus) => setFocused(focus)}
            />
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
          </ChatInputEditorRow>
          <ChatInputAttachments />
        </ChatInputBorder>
      </ChatInputContainer>
      <Suggestions onSuggestion={onSendSuggestion} />
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
