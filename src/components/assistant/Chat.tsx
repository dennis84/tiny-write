import {createSignal, For, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {Message, useState} from '@/state'
import {Chunk} from '@/services/CopilotService'
import {itemCss, Text} from '../menu/Style'
import {IconAdd, IconClose} from '../Icon'
import {Button, ButtonGroup} from '../Button'
import {Drawer} from '../Drawer'
import {ChatInput} from './ChatInput'
import {ModelSelect} from './ModelSelect'
import {Threads} from './Threads'
import {MessageQuestion} from './MessageQuestion'
import {MessageAnswer} from './MessageAnswer'
import {Suggestions} from './Suggestions'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'

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
      border-radius: var(--border-radius-small);
    }
  }
`

const Messages = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const Chat = () => {
  let inputRef!: HTMLDivElement

  const {aiService, copilotService, threadService, toastService} = useState()
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

  const addUserMessage = async (input: Message) => {
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
        (chunk: Chunk) => {
          for (const choice of chunk.choices) {
            threadService.streamLastMessage(
              messageId,
              choice.delta?.content ?? choice.message?.content ?? '',
            )
          }

          scrollToInput()
        },
        async () => {
          threadService.streamLastMessageEnd(messageId)
          await threadService.saveThread()

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

  const onInputMessage = (message: Message) => {
    addUserMessage(message)
    focusInput()
    if (!message.type && message.role === 'user') {
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

  const onDrawerResized = (width: number) => {
    aiService.setSidebarWidth(width)
  }

  const onRegenerate = (message: Message) => {
    threadService.regenerate(message)
    void sendMessages()
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
    <Drawer
      width={aiService.sidebarWidth}
      onResized={onDrawerResized}
      background={10}
      data-tauri-drag-region="true"
    >
      <ButtonGroup>
        <Show when={threadService.currentThread?.messages?.length}>
          <Button onClick={onClearThread}>
            <IconClose /> Clear
          </Button>
          <Button onClick={onNewThread}>
            <IconAdd /> New
          </Button>
        </Show>
        <Threads onChange={() => focusInput()} />
        <ModelSelect onChange={() => focusInput()} />
      </ButtonGroup>
      <Messages>
        <For each={threadService.currentThread?.messages} fallback={<Empty />}>
          {(message) => (
            <Switch>
              <Match when={message.role === 'user'}>
                <MessageQuestion message={message} onUpdate={onRegenerate} />
              </Match>
              <Match when={message.role === 'assistant'}>
                <MessageAnswer message={message} onRegenerate={onRegenerate} />
              </Match>
            </Switch>
          )}
        </For>
      </Messages>
      <Show when={focus()} keyed>
        <ChatInput ref={inputRef} onMessage={onInputMessage} />
      </Show>
      <Suggestions onSuggestion={onInputMessage} />
    </Drawer>
  )
}
