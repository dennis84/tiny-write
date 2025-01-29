import {createSignal, For, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {Message, useState} from '@/state'
import {isTauri} from '@/env'
import {fullWidth, itemCss, Text} from '../menu/Style'
import {IconAdd, IconClose} from '../Icon'
import {Button} from '../Button'
import {ChatInput, ChatInputMessage} from './ChatInput'
import {ModelSelect} from './ModelSelect'
import {Threads} from './Threads'
import {MessageQuestion} from './MessageQuestion'
import {MessageAnswer} from './MessageAnswer'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'

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

export const Chat = () => {
  let inputRef!: HTMLDivElement

  const {copilotService, threadService, toastService} = useState()
  const [focus, setFocus] = createSignal(true)
  const [editMessage, setEditMessage] = createSignal<Message>()

  const scrollToInput = () => {
    inputRef.scrollIntoView({
      behavior: 'instant',
      block: 'start',
    })
  }

  const focusInput = () => {
    setFocus(false)
    setFocus(true)
  }

  const addUserMessage = async (input: ChatInputMessage) => {
    if (!input.content) return
    const isUpdate = editMessage() !== undefined

    if (isUpdate) {
      setEditMessage(undefined)
      await threadService.updateMessage(input)
    } else {
      await threadService.addMessage(input)
    }
  }

  const sendMessages = async () => {
    const currentThread = threadService.currentThread
    const messages = threadService.getMessages()
    if (!currentThread || !messages) return

    const messageId = uuidv4()

    try {
      await copilotService.completions(
        messages,
        (message: any) => {
          for (const choice of message.choices) {
            threadService.streamLastMessage(
              messageId,
              choice.delta?.content ?? choice.message?.content ?? '',
            )
          }

          scrollToInput()
        },
        async () => {
          threadService.streamLastMessageEnd(messageId)
          if (!currentThread.title) {
            try {
              const title = await threadService.generateTitle()
              if (title) await threadService.updateTitle(title)
            } catch (_e) {
              // ignore
            }
          }
        },
      )
    } catch (error: any) {
      toastService.open({message: error?.message ?? error, action: 'Close'})
    }
  }

  const onInputMessage = (message: ChatInputMessage) => {
    addUserMessage(message)
    focusInput()

    if (!message.attachment && message.role === 'user') {
      void sendMessages()
    }
  }

  const onClearThread = () => {
    setEditMessage(undefined)
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
    <Drawer data-tauri-drag-region="true">
      <Messages>
        <For each={threadService.currentThread?.messages} fallback={<Empty />}>
          {(message) => (
            <Switch>
              <Match when={message.role === 'user'}>
                <MessageQuestion message={message} />
              </Match>
              <Match when={message.role === 'assistant'}>
                <MessageAnswer message={message} />
              </Match>
            </Switch>
          )}
        </For>
      </Messages>
      <Show when={focus()} keyed>
        <ChatInput
          ref={inputRef}
          onMessage={onInputMessage}
          onCancel={() => setEditMessage(undefined)}
        />
      </Show>
      <ChatActions>
        <Show when={threadService.currentThread?.messages?.length}>
          <Button onClick={onClearThread}>
            <IconClose /> Clear thread
          </Button>
          <Button onClick={onNewThread}>
            <IconAdd /> New thread
          </Button>
        </Show>
        <Threads onChange={() => focusInput()} />
        <ModelSelect onChange={() => focusInput()} />
      </ChatActions>
    </Drawer>
  )
}
