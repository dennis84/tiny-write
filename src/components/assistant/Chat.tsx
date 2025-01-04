import {createSignal, For, Show} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {createStore} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {EditorView} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import markdownit from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {v4 as uuidv4} from 'uuid'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {useState} from '@/state'
import {ChatRole} from '@/remote/copilot'
import {Drawer, Text} from '../menu/Style'
import {Icon, IconCopilot} from '../Icon'
import {Button, IconButton} from '../Button'
import {ChatInput, ChatInputMessage, RenderMessage} from './ChatInput'
import {ModelSelect} from './ModelSelect'
import {Tooltip} from '../Tooltip'

const Messages = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
`

const chatBubble = `
  position: relative;
  flex-basis: 100%;
  margin-bottom: 20px;
  border-radius: var(--border-radius);
  font-size: var(--menu-font-size);
  .cm-editor {
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    border-radius: var(--border-radius);
  }
  .cm-gap {
    display: none;
  }
  pre:not(.cm-rendered) {
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    padding: 5px;
  }
  a {
    color: var(--primary-background);
  }
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  max-width: 80%;
  padding: 20px;
  justify-self: flex-end;
  margin-left: auto;
  background: var(--foreground-10);
`

const AnswerBubble = styled('div')`
  ${chatBubble}
`

const AnswerBadge = styled('span')`
  background: var(--primary-background);
  color: var(--primary-foreground);
  border-radius: var(--border-radius);
  padding: 2px;
  display: inline-flex;
  align-items: center;
  margin-bottom: 10px;
  .icon {
    margin-right: 5px;
  }
`

const BubbleMenu = styled('div')`
  position: absolute;
  top: 5px;
  right: 5px;
`

const ChatActions  = styled('div')`
  margin-top: 20px;
`

interface Message {
  content: string
  html?: string
  role: ChatRole
  error?: string
  render?: RenderMessage
}

interface CurrentAnswer {
  content: string
  html: string
}

interface ChatState {
  messages: Message[]
  currentAnswer?: CurrentAnswer
}

interface MessageEditor {
  id: string
  doc: string
  lang: string
}

export const Chat = () => {
  let drawerRef!: HTMLElement

  const {configService, copilotService} = useState()
  const [chatState, setChatState] = createStore<ChatState>({messages: []})
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [selectedMessage, setSelectedMessage] = createSignal<Message>()

  const renderMessageEditors = () => {
    const editors = messageEditors()
    for (const ed of editors ?? []) {
      const parent = document.getElementById(ed.id)
      if (!parent) return

      const theme = getTheme(configService.codeTheme.value)
      const lang = getLanguageConfig(ed.lang)
      const doc = ed.doc.trim()

      new EditorView({
        parent,
        doc,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          theme,
          lang.highlight(),
        ],
      })
    }

    setMessageEditors([])
  }

  const streamMd = markdownit({html: true})

  const finalMd = markdownit({
    html: true,
    highlight: (doc: string, lang: string) => {
      const id = uuidv4()
      const parent = document.createElement('pre')
      parent.id = id
      parent.className = 'cm-rendered'
      setMessageEditors((prev) => [...prev, {id, doc, lang}])
      return parent.outerHTML
    },
  }).use(iterator, 'url_new_win', 'link_open', (tokens: any, idx: any) => {
    tokens[idx].attrPush(['target', '_blank'])
  })

  const scrollToBottom = () => {
    drawerRef.scrollTo(0, drawerRef.scrollHeight)
  }

  const addUserMessage = (input: ChatInputMessage) => {
    if (!input.content) return
    const html = finalMd.render(input.content)
    const message: Message = {...input, html, role: 'user'}
    setChatState('messages', (prev) => [...prev, message])
    scrollToBottom()
    renderMessageEditors()
  }

  const sendMessages = async () => {
    try {
      await copilotService.completions(
        chatState.messages.filter((m) => !m.error),
        (message: any) => {
          for (const choice of message.choices) {
            const cur = chatState.currentAnswer
            let content =
              (cur?.content ?? '') + (choice.delta?.content ?? choice.message?.content ?? '')
            const html = streamMd.render(content)
            setChatState('currentAnswer', {content, html})
            scrollToBottom()
          }
        },
        () => {
          const cur = chatState.currentAnswer
          if (cur) {
            const content = cur.content
            const html = finalMd.render(content)
            const message: Message = {role: 'assistant', content, html}
            setChatState('messages', (prev) => [...prev, message])
            setChatState('currentAnswer', undefined)
            renderMessageEditors()
            scrollToBottom()
          }
        },
      )
    } catch (error) {
      setChatState('messages', chatState.messages.length - 1, {error: error as string})
    }
  }

  const onInputMessage = (message: ChatInputMessage) => {
    addUserMessage(message)
    if (!message.attachment) {
      setChatState('currentAnswer', {content: ''})
      sendMessages()
    }
  }

  const closeBubbleMenu = () => {
    setSelectedMessage(undefined)
    setTooltipAnchor(undefined)
  }

  const onRemoveMessage = () => {
    const message = selectedMessage()
    if (!message) return
    const index = chatState.messages.indexOf(message)
    setChatState('messages', (prev: Message[]) => prev.filter((_, i) => i !== index))
    closeBubbleMenu()
  }

  const onClear = () => {
    setChatState({messages: [], currentAnswer: undefined})
  }

  const Empty = () => (
    <>
      <Text>Ask Copilot a question ...</Text>
    </>
  )

  const Question = (props: {message: Message}) => {
    const onBubbleMenu = (e: MouseEvent) => {
      setTooltipAnchor(e.target as HTMLElement)
      setSelectedMessage(props.message)
    }

    return (
      <QuestionBubble>
        <Show when={props.message.render}>
          <Dynamic
            component={props.message.render?.component}
            html={props.message.html}
            {...props.message.render?.props}
          />
        </Show>
        <div>
          {props.message.error ? ` (This question has errors: ${props.message.error})` : ''}
        </div>
        <BubbleMenu>
          <IconButton onClick={onBubbleMenu}>
            <Icon>more_vert</Icon>
          </IconButton>
        </BubbleMenu>
      </QuestionBubble>
    )
  }

  const Answer = (props: {message?: Message; currentAnswer?: CurrentAnswer}) => {
    const onBubbleMenu = (e: MouseEvent) => {
      setTooltipAnchor(e.target as HTMLElement)
      setSelectedMessage(props.message)
    }

    return (
      <AnswerBubble>
        <AnswerBadge>
          <IconCopilot /> Assistant:
        </AnswerBadge>
        <Show when={props.currentAnswer?.content === ''}>
          <div>Loading ...</div>
        </Show>
        <Show when={props.message?.html ?? props.currentAnswer?.html}>
          <div innerHTML={props.message?.html ?? props.currentAnswer?.html} />
        </Show>
        <Show when={props.message !== undefined}>
          <BubbleMenu>
            <IconButton onClick={onBubbleMenu}>
              <Icon>more_vert</Icon>
            </IconButton>
          </BubbleMenu>
        </Show>
      </AnswerBubble>
    )
  }

  return (
    <Drawer data-tauri-drag-region="true" ref={drawerRef} width="50vw">
      <ModelSelect />
      <Messages>
        <For each={chatState.messages} fallback={<Empty />}>
          {(message) => (
            <Show when={message.role === 'assistant'} fallback={<Question message={message} />}>
              <Answer message={message} />
            </Show>
          )}
        </For>
        <Show when={chatState.currentAnswer}>
          <Answer currentAnswer={chatState.currentAnswer!} />
        </Show>
      </Messages>
      <ChatInput onMessage={onInputMessage} />
      <ChatActions>
        <Show when={chatState.messages.length > 0}>
          <Button onClick={onClear}><Icon>clear</Icon> Clear thread</Button>
        </Show>
      </ChatActions>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={closeBubbleMenu} backdrop={true}>
          <div onClick={onRemoveMessage}>
            <Icon>close</Icon>
            Remove message
          </div>
        </Tooltip>
      </Show>
    </Drawer>
  )
}
