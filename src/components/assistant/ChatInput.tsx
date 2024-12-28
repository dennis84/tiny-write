import {Component, createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {defaultKeymap} from '@codemirror/commands'
import {getTheme} from '@/codemirror/theme'
import {useState} from '@/state'
import {Common} from '../Button'
import {Icon} from '../Icon'
import {Tooltip} from '../Tooltip'
import {CurrentFileButton} from './attachments/CurrentFile'

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

export interface RenderMessage {
  component?: Component<any>
  props?: any
}

export interface ChatInputMessage {
  content: string
  attachment: boolean
  render: RenderMessage
}

interface Props {
  onMessage: (message: ChatInputMessage) => void
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

  const Message = ({content}: {content: string}) => <>{content}</>

  const onSend = () => {
    const view = editorView()
    if (!view) return
    const content = view.state.doc.toString().trim()
    if (content) {
      props.onMessage({
        content,
        attachment: false,
        render: {
          component: Message,
          props: {content},
        },
      })
    }

    view.dispatch({
      changes: {from: 0, to: content.length, insert: ''},
    })
  }

  onMount(() => {
    const theme = getTheme(configService.codeTheme.value)
    const view = new EditorView({
      parent: chatInputRef,
      doc: '',
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
          <ChatInputButton onClick={onSend}>
            <Icon>send</Icon>
          </ChatInputButton>
        </ChatInputAction>
      </ChatInputContainer>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={() => closeTooltip()} backdrop={true}>
          <CurrentFileButton onAttachment={onAttachment} />
        </Tooltip>
      </Show>
    </>
  )
}
