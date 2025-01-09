import {createSignal, For, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Message, useState} from '@/state'
import {Drawer, Text} from '../menu/Style'
import {Icon} from '../Icon'
import {Button} from '../Button'
import {ChatInput, ChatInputMessage} from './ChatInput'
import {ModelSelect} from './ModelSelect'
import {Threads} from './Threads'
import {ChatMessage} from './ChatMessage'

const Messages = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
`

const ChatActions = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  > * {
    margin-right: 5px;
    margin-bottom: 5px;
  }
`

interface CurrentAnswer extends Message {
  content: string
  html?: string
  role: 'assistant'
}

export const Chat = () => {
  let drawerRef!: HTMLElement

  const {copilotService, threadService} = useState()
  const [currentAnswer, setCurrentAnswer] = createSignal<CurrentAnswer>()
  const [focus, setFocus] = createSignal(true)

  const scrollToBottom = () => {
    drawerRef.scrollTo(0, drawerRef.scrollHeight)
  }

  const focusInput = () => {
    setFocus(false)
    setFocus(true)
  }

  const addUserMessage = async (input: ChatInputMessage) => {
    if (!input.content) return
    const message: Message = {...input, role: 'user'}
    await threadService.addMessage(message)
    scrollToBottom()
  }

  const sendMessages = async () => {
    const currentThread = threadService.currentThread
    if (!currentThread) return
    const messages = currentThread.messages.filter((m) => !m.error)
    // final must be role user
    if (messages[messages.length - 1].role !== 'user') {
      return
    }

    try {
      await copilotService.completions(
        messages,
        (message: any) => {
          for (const choice of message.choices) {
            const cur = currentAnswer()
            let content =
              (cur?.content ?? '') + (choice.delta?.content ?? choice.message?.content ?? '')
            setCurrentAnswer({content, role: 'assistant'})
            scrollToBottom()
          }
        },
        async () => {
          const cur = currentAnswer()
          if (cur) {
            const content = cur.content
            const message: Message = {role: 'assistant', content}
            await threadService.addMessage(message)
            setCurrentAnswer(undefined)
            scrollToBottom()
          }
        },
      )
    } catch (error) {
      threadService.setError(error as string)
    }
  }

  const onInputMessage = (message: ChatInputMessage) => {
    addUserMessage(message)
    if (!message.attachment) {
      const cur = currentAnswer()
      setCurrentAnswer({...cur, content: '', role: 'assistant'})
      sendMessages()
    }

    focusInput()
  }

  const onClearThread = () => {
    setCurrentAnswer(undefined)
    threadService.clear()
    focusInput()
  }

  const onNewThread = () => {
    threadService.newThread()
    focusInput()
  }

  onMount(() => {
    threadService.newThread()
  })

  const Empty = () => (
    <>
      <Text>Ask Copilot a question ...</Text>
    </>
  )

  return (
    <Drawer data-tauri-drag-region="true" ref={drawerRef} width="50vw">
      <Messages>
        <For each={threadService.currentThread?.messages} fallback={<Empty />}>
          {(message) => <ChatMessage message={message} />}
        </For>
        <Show when={currentAnswer()}>
          {(cur) => <ChatMessage streaming={true} message={cur()} />}
        </Show>
      </Messages>
      <Show when={focus()}>
        <ChatInput onMessage={onInputMessage} />
      </Show>
      <ChatActions>
        <Show when={threadService.currentThread?.messages?.length}>
          <Button onClick={onClearThread}>
            <Icon>clear</Icon> Clear thread
          </Button>
          <Button onClick={onNewThread}>
            <Icon>add</Icon> New thread
          </Button>
        </Show>
        <Show when={threadService.currentThread && threadService.isThreadEmpty(threadService.currentThread)}>
          <Threads onChange={() => focusInput()} />
        </Show>
        <ModelSelect onChange={() => focusInput()} />
      </ChatActions>
    </Drawer>
  )
}
