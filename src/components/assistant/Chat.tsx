import {createSignal, For, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Message, useState} from '@/state'
import {isTauri} from '@/env'
import {fullWidth, itemCss, Text} from '../menu/Style'
import {Icon} from '../Icon'
import {Button} from '../Button'
import {Tooltip} from '../Tooltip'
import {ChatInput, ChatInputMessage} from './ChatInput'
import {ModelSelect} from './ModelSelect'
import {Threads} from './Threads'
import {ChatQuestion} from './ChatQuestion'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {ChatAnswer} from './ChatAnswer'

const Drawer = styled('div')`
  background: var(--foreground-5);
  padding: 20px;
  height: 100%;
  width: 50vw;
  overflow-y: auto;
  scrollbar-width: none;
  @media (max-width: ${fullWidth.toString()}px) {
    width: 100vw;
    ${isTauri() ? 'padding-top: 40px' : ''}
  }
  &::-webkit-scrollbar {
    display: none;
  }
`

const EmptyContainer = styled('div')`
  width: 100%;
  p {
    margin-bottom: 10px;
  }
  div {
    ${itemCss}
    cursor: var(--cursor-pointer);
    &:hover {
      color: var(--primary-background);
      background: var(--foreground-10);
      border-radius: var(--border-radius);
    }
  }
`

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
  let drawerRef!: HTMLDivElement

  const {copilotService, threadService} = useState()
  const [currentAnswer, setCurrentAnswer] = createSignal<CurrentAnswer>()
  const [focus, setFocus] = createSignal(true)
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()
  const [selectedMessage, setSelectedMessage] = createSignal<Message>()

  const scrollToBottom = () => {
    drawerRef.scrollTo(0, drawerRef.scrollHeight)
  }

  const focusInput = () => {
    setFocus(false)
    setFocus(true)
  }

  const onBubbleMenu = (event: MouseEvent, message: Message) => {
    setTooltipAnchor(event.target as HTMLElement)
    setSelectedMessage(message)
  }

  const closeBubbleMenu = () => {
    setTooltipAnchor(undefined)
  }

  const onRemoveMessage = async () => {
    const message = selectedMessage()
    if (!message) return
    await threadService.removeMessage(message)
    closeBubbleMenu()
  }

  const addUserMessage = async (input: ChatInputMessage) => {
    if (!input.content) return
    const message: Message = {...input, role: 'user'}
    await threadService.addMessage(message)
    scrollToBottom()
  }

  const sendMessages = async () => {
    const currentThread = threadService.currentThread
    const messages = threadService.getMessages()
    if (!currentThread || !messages) return

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

            if (!currentThread.title) {
              try {
                const title = await threadService.generateTitle()
                if (title) await threadService.updateTitle(title)
              } catch (_e) {
                // ignore
              }
            }
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
    <EmptyContainer>
      <Text>Add to context:</Text>
      <CurrentFileButton onAttachment={onInputMessage} />
      <SelectionButton onAttachment={onInputMessage} />
    </EmptyContainer>
  )

  return (
    <Drawer data-tauri-drag-region="true" ref={drawerRef}>
      <Messages>
        <For each={threadService.currentThread?.messages} fallback={<Empty />}>
          {(message) => (
            <Switch>
              <Match when={message.role === 'user'}>
                <ChatQuestion message={message} onBubbleMenu={onBubbleMenu} />
              </Match>
              <Match when={message.role === 'assistant'}>
                <ChatAnswer message={message} onBubbleMenu={onBubbleMenu} />
              </Match>
            </Switch>
          )}
        </For>
        <Show when={currentAnswer()}>
          {(cur) => <ChatAnswer streaming={true} message={cur()} />}
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
        <Threads onChange={() => focusInput()} />
        <ModelSelect onChange={() => focusInput()} />
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
