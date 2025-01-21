import {createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {defaultKeymap} from '@codemirror/commands'
import {getTheme} from '@/codemirror/theme'
import {Message, useState} from '@/state'
import {Common} from '../Button'
import {Icon} from '../Icon'
import {Tooltip} from '../Tooltip'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'

const ChatInputContainer = styled('div')`
  margin-top: 20px;
  position: relative;
  .cm-editor {
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
    padding-right: 60px;
    cursor: var(--cursor-text);
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    outline: none;
    &.cm-focused {
      border-color: var(--primary-background);
      box-shadow: 0 0 0 1px var(--primary-background);
    }
  }
`

const ChatInputAction = styled('div')`
  position: absolute;
  right: 0;
  bottom: 0;
  height: 50px;
  align-items: center;
  display: flex;
  padding: 10px;
`

const ChatInputButton = styled('button')`
  ${Common}
  background: none;
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--foreground-50);
  border-radius: var(--border-radius);
  &:hover {
    background: var(--background-60);
  }
  .icon {
    margin: 0;
  }
`

export interface ChatInputMessage extends Message {
  attachment: boolean
}

interface Props {
  onMessage: (message: ChatInputMessage) => void
  onCancel: () => void
  message?: Message
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
    props.onMessage({
      attachment: false,
      id: uuidv4(),
      role: 'user',
      ...props.message,
      content,
    })

    view.dispatch({
      changes: {from: 0, to: content.length, insert: ''},
    })
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
        keymap.of([
          {
            key: 'Enter',
            run: () => {
              onSend()
              return true
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
      <ChatInputContainer>
        <div ref={chatInputRef}></div>
        <ChatInputAction>
          <ChatInputButton onClick={onAttachmentMenu}>
            <Icon>attachment</Icon>
          </ChatInputButton>
          <Show when={props.message}>
            <ChatInputButton onClick={onCancel}>
              <Icon>close</Icon>
            </ChatInputButton>
          </Show>
          <ChatInputButton onClick={onSend}>
            <Icon>{props.message ? 'check' : 'send'}</Icon>
          </ChatInputButton>
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
