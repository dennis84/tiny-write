import {WheelGesture} from '@use-gesture/vanilla'
import type {EditorView} from 'prosemirror-view'
import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {serialize} from '@/prosemirror/markdown-serialize'
import {ProseMirrorService} from '@/services/ProseMirrorService'
import {useState} from '@/state'
import {type Attachment, type Message, Page} from '@/types'
import {IconButton} from '../Button'
import {
  IconAttachment,
  IconKeyboardArrowDown,
  IconKeyboardArrowUp,
  IconSend,
  IconStop,
} from '../Icon'
import {Tooltip} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'
import {CurrentFileButton} from './attachments/CurrentFile'
import {ImageButton} from './attachments/Image'
import {SelectionButton} from './attachments/Selection'
import {ChatEditor} from './ChatEditor'
import {ChatInputAttachments} from './ChatInputAttachments'
import {
  ChatInputAction,
  ChatInputActionRow,
  ChatInputBorder,
  ChatInputContainer,
  ChatInputEditorRow,
} from './Style'
import {Suggestions} from './Suggestions'
import { ModelSelect } from './ModelSelect'

const ChatInputTopRow = styled('div')`
  position: relative;
  width: 100%;
  height: 0;
  display: flex;
  justify-content: center;
`

const ScrollDown = styled('span')`
  position: absolute;
  top: -60px;
  z-index: var(--z-index-above-content);
  button {
    background: var(--foreground-10);
  }
`

interface Props {
  onMessage: (message: Message) => void
  ref?: HTMLDivElement
  dropArea?: () => HTMLElement
  setEditorView?: (view: EditorView) => void
}

export const ChatInput = (props: Props) => {
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [focused, setFocused] = createSignal(false)
  const [editorView, setEditorView] = createSignal<EditorView>()
  const [isAtBottom, setIsAtBottom] = createSignal<boolean | undefined>(undefined)
  const [empty, setEmpty] = createSignal(true)

  const {store, copilotService, threadService, mediaService} = useState()

  const scrollToTop = () => {
    props.dropArea?.().scrollTo({top: 0, behavior: 'smooth'})
    setIsAtBottom(false)
  }

  const scrollToBottom = () => {
    const scrollContent = props.dropArea?.()
    if (!scrollContent) return
    const top = scrollContent.scrollHeight + 100
    scrollContent.scrollTo({top, behavior: 'smooth'})
    setIsAtBottom(true)
  }

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

    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }

  const onSendSuggestion = (content: string) => {
    const view = editorView()
    if (!view) return
    const tr = view.state.tr
    tr.insert(0, view.state.schema.text(content))
    view.dispatch(tr)
  }

  const onStop = () => {
    copilotService.stop()
  }

  const onSetEditorView = (view: EditorView) => {
    setEditorView(view)
    props.setEditorView?.(view)
  }

  const onFocus = (focus: boolean) => {
    setFocused(focus)
  }

  const onChange = () => {
    setEmpty(ProseMirrorService.isEmpty(editorView()?.state) ?? true)
  }

  const canScroll = () => {
    const scrollContentRef = props.dropArea?.()
    const contentHeight = (scrollContentRef?.firstChild as Element | null)?.clientHeight ?? 0
    return contentHeight > (scrollContentRef?.clientHeight ?? 0)
  }

  onMount(() => {
    const scrollContentRef = props.dropArea?.()
    if (!scrollContentRef) return
    const gesture = new WheelGesture(
      scrollContentRef,
      ({event, velocity: [_, y]}) => {
        // Only on user input not programmatic scroll
        if (!event.deltaY) return
        if (Math.abs(y) < 0.5) return
        if (!canScroll()) return

        const newValue =
          scrollContentRef.scrollHeight -
            scrollContentRef.scrollTop -
            scrollContentRef.clientHeight <
          90 // ~ the height of the input area

        setIsAtBottom(newValue)
      },
      {threshold: 10}, // Ignore scrolls smaller than 10px
    )

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return (
    <>
      <ChatInputContainer
        style={store.location?.page !== Page.Assistant ? {'max-width': '100%'} : {}}
        onClick={() => editorView()?.focus()}
      >
        <ChatInputBorder ref={props.ref} focused={focused()}>
          <ChatInputTopRow>
            <Show when={isAtBottom()}>
              <ScrollDown>
                <IconButton onClick={() => scrollToTop()}>
                  <IconKeyboardArrowUp />
                </IconButton>
              </ScrollDown>
            </Show>
            <Show when={isAtBottom() === false}>
              <ScrollDown>
                <IconButton onClick={() => scrollToBottom()}>
                  <IconKeyboardArrowDown />
                </IconButton>
              </ScrollDown>
            </Show>
          </ChatInputTopRow>
          <ChatInputEditorRow>
            <ChatEditor
              setEditorView={onSetEditorView}
              onSubmit={onSend}
              onFocus={onFocus}
              onChange={onChange}
            />
          </ChatInputEditorRow>
          <Show when={empty()}>
            <Suggestions onSuggestion={onSendSuggestion} />
          </Show>
          <ChatInputActionRow>
            <ChatInputAttachments />
            <ModelSelect onChange={() => editorView()?.focus()} />
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
          </ChatInputActionRow>
        </ChatInputBorder>
      </ChatInputContainer>
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
