import {For, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Channel} from '@tauri-apps/api/core'
import markdownit from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {EditorView, keymap, placeholder} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {defaultKeymap} from '@codemirror/commands'
import {useState} from '@/state'
import {ChatRole, sendChatMessage} from '@/remote/copilot'
import {getTheme} from '@/codemirror/theme'
import {highlight} from '@/codemirror/highlight'
import {Icon, IconCopilot} from '../Icon'
import {Common} from '../Button'
import {Drawer, Text} from './Style'
import {createStore} from 'solid-js/store'

const SelectModel = styled('select')`
  margin-top: 20px;
`

const Messages = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
`

const chatBubble = `
  flex-basis: 100%;
  margin-bottom: 20px;
  border-radius: var(--border-radius);
  font-size: var(--menu-font-size);
`

const Question = styled('div')`
  ${chatBubble}
  max-width: 80%;
  padding: 20px;
  justify-self: flex-end;
  margin-left: auto;
  background: var(--foreground-10);
`

const Answer = styled('div')`
  ${chatBubble}
  > span {
    background: var(--primary-background);
    color: var(--primary-foreground);
    border-radius: var(--border-radius);
    padding: 2px;
    display: inline-flex;
    align-items: center;
    margin-bottom: 10px;
  }
  .icon {
    margin-right: 5px;
  }
  .cm-editor {
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    border-radius: var(--border-radius);
  }
`

const ChatInput = styled('div')`
  margin-top: 20px;
  position: relative;
  .cm-editor {
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
    padding-right: 50px;
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

const ChatInputSend = styled('button')`
  ${Common}
  background: none;
  width: 40px;
  height: 40px;
  position: absolute;
  color: var(--foreground-50);
  bottom: 5px;
  right: 5px;
  border-radius: var(--border-radius);
  &:hover {
    background: var(--background-60);
  }
`

interface Message {
  content: string
  html?: string
  role: ChatRole
  error?: string
}

interface CurrentAnswer {
  content: string
  html: string
}

interface ChatState {
  messages: Message[]
  currentAnswer?: CurrentAnswer
  models: string[]
}

export const AiChat = () => {
  let drawerRef!: HTMLElement
  let chatInputRef!: HTMLDivElement

  const {store, copilotService, configService} = useState()
  const [chatState, setChatState] = createStore<ChatState>({messages: [], models: []})

  const md = markdownit({
    html: true,
    highlight: (src: string, lang: string) => {
      const parent = document.createElement('pre')
      const theme = getTheme(configService.codeTheme.value)
      const langSupport = highlight(lang)

      new EditorView({
        parent,
        doc: src,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          theme,
          ...(langSupport ? [langSupport] : []),
        ],
      })

      return parent.innerHTML
    },
  }).use(iterator, 'url_new_win', 'link_open', (tokens: any, idx: any) => {
    tokens[idx].attrPush(['target', '_blank'])
  })

  const sendMessage = async (content: string) => {
    if (!content) return

    const model = store.ai?.copilot?.chatModel
    if (!model) return

    setChatState('messages', (prev) => [...prev, {content, role: 'user'}])
    drawerRef.scrollTo(0, drawerRef.scrollHeight)

    const channel = new Channel<string>()
    channel.onmessage = (message) => {
      if (message.startsWith('[DONE]')) {
        const cur = chatState.currentAnswer
        if (cur) {
          const message: Message = {role: 'assistant', ...cur}
          setChatState('messages', (prev) => [...prev, message])
          setChatState('currentAnswer', undefined)
        }
      } else {
        const json = JSON.parse(message) as any
        for (const choice of json.choices) {
          const cur = chatState.currentAnswer
          let content = (cur?.content ?? '') + (choice.delta.content || '')
          const html = md.render(content)
          setChatState('currentAnswer', {content, html})
        }
      }
    }

    try {
      await sendChatMessage(
        model,
        chatState.messages.filter((m) => !m.error),
        channel,
      )
    } catch (error) {
      setChatState('messages', chatState.messages.length - 1, {error: error as string})
    }
  }

  const onModelChange = (e: Event) => {
    copilotService.setChatModel((e.target as HTMLSelectElement).value)
  }

  const Empty = () => (
    <>
      <Text>Ask Copilot a question ...</Text>
    </>
  )

  onMount(async () => {
    setChatState('models', await copilotService.getChatModels())

    const theme = getTheme(configService.codeTheme.value)
    const editorView = new EditorView({
      parent: chatInputRef,
      doc: '',
      extensions: [
        theme,
        keymap.of([
          {
            key: 'Enter',
            run: (editorView) => {
              sendMessage(editorView.state.doc.toString().trim())
              editorView.dispatch({
                changes: {from: 0, to: editorView.state.doc.length, insert: ''},
              })

              return true
            },
          },
        ]),
        placeholder('Ask Copilot'),
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
      ],
    })

    // Hight is not set correctly without timeout
    setTimeout(() => editorView.focus(), 50)
  })

  return (
    <Drawer data-tauri-drag-region="true" ref={drawerRef} width="50vw">
      <SelectModel onChange={onModelChange}>
        <For each={chatState.models}>
          {(m) => <option selected={store.ai?.copilot?.chatModel === m}>{m}</option>}
        </For>
      </SelectModel>

      <Messages>
        <For each={chatState.messages} fallback={<Empty />}>
          {(message) => (
            <Show
              when={message.role === 'assistant'}
              fallback={
                <Question>
                  {message.content}
                  {message.error ? ` (This question has errors: ${message.error})` : ''}
                </Question>
              }
            >
              <Answer>
                <span>
                  <IconCopilot /> Assistant:
                </span>
                <div innerHTML={message.html} />
              </Answer>
            </Show>
          )}
        </For>
        <Show when={chatState.currentAnswer}>
          <Answer>
            <IconCopilot />
            <div innerHTML={chatState.currentAnswer?.html} />
          </Answer>
        </Show>
      </Messages>

      <ChatInput>
        <div ref={chatInputRef}></div>
        <ChatInputSend>
          <Icon>send</Icon>
        </ChatInputSend>
      </ChatInput>
    </Drawer>
  )
}
