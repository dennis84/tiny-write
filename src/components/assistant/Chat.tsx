import {createSignal, Match, onCleanup, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {WheelGesture} from '@use-gesture/vanilla'
import {type Message, useState} from '@/state'
import type {Chunk} from '@/services/CopilotService'
import {IconAdd, IconKeyboardArrowDown} from '../Icon'
import {Button, ButtonGroup, IconButton} from '../Button'
import {TooltipDivider} from '../Tooltip'
import {ChatInput} from './ChatInput'
import {ModelSelect} from './ModelSelect'
import {Threads} from './Threads'
import {MessageQuestion} from './MessageQuestion'
import {MessageAnswer} from './MessageAnswer'
import {Suggestions} from './Suggestions'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {AutoContextButton} from './attachments/AutoContext'
import {MessageAttachment} from './MessageAttachment'

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 100%;
`

const EmptyContainer = styled('div')`
  width: 100%;
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
`

const Messages = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const ScrollDown = styled('div')`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: var(--z-index-above-content);
  button {
    background: var(--foreground-10);
  }
`

interface Props {
  scrollContent: () => HTMLElement
  onChangeThread: (id: string) => void
}

export const Chat = (props: Props) => {
  let inputRef!: HTMLDivElement
  let containerRef!: HTMLDivElement

  const {store, copilotService, threadService, toastService} = useState()
  const [focus, setFocus] = createSignal(true)
  const [autoScrolling, setAutoScrolling] = createSignal(true)

  const scrollToBottom = () => {
    props.scrollContent().scrollTo({
      top: props.scrollContent().scrollHeight,
      behavior: 'smooth',
    })
  }

  const isAtBottom = () =>
    props.scrollContent().scrollHeight -
      props.scrollContent().scrollTop -
      props.scrollContent().clientHeight <
    10

  const focusInput = () => {
    setFocus(false)
    setFocus(true)
    setAutoScrolling(true)
  }

  const addUserMessage = async (input: Message) => {
    if (!input.content && !input.attachments) return
    await threadService.addMessage(input)
  }

  const sendMessages = async () => {
    const currentThread = threadService.currentThread

    if (store.ai?.autoContext) {
      await threadService.insertAutoContext()
    }

    const {messages, nextId, parentId} = threadService.getMessages()
    if (!currentThread || !messages) return

    const messageId = nextId ?? uuidv4()

    // Create answer message directly to visualize loading
    threadService.streamLastMessage(messageId, parentId, '')

    try {
      await copilotService.completions(
        messages,
        (chunk: Chunk) => {
          for (const choice of chunk.choices) {
            const chunk = choice.delta?.content ?? choice.message?.content ?? ''
            threadService.streamLastMessage(messageId, parentId, chunk)
            if (autoScrolling()) scrollToBottom()
          }
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

  const onInputMessage = async (message: Message) => {
    await addUserMessage(message)
    focusInput()
    if (!message.type && message.role === 'user') {
      void sendMessages()
    }
  }

  const onNewThread = () => {
    const newThread = threadService.newThread()
    focusInput()
    props.onChangeThread(newThread.id)
  }

  const onRegenerate = (message: Message) => {
    threadService.regenerate(message)
    void sendMessages()
  }

  onMount(() => {
    const gesture = new WheelGesture(
      props.scrollContent(),
      () => {
        // activate auto scrolling when at bottom
        setAutoScrolling(isAtBottom())
      },
      {threshold: 10},
    )

    onCleanup(() => {
      gesture.destroy()
    })
  })

  const Empty = () => (
    <EmptyContainer>
      <Show when={!store.ai?.autoContext}>
        <CurrentFileButton onAttachment={onInputMessage} />
        <SelectionButton onAttachment={onInputMessage} />
        <TooltipDivider />
      </Show>
      <AutoContextButton />
    </EmptyContainer>
  )

  const MessageTree = (p: {id: string | undefined; childrenIds: string[]}) => (
    <Show when={threadService.getItem(p.id, p.childrenIds)}>
      {(message) => (
        <>
          <Switch>
            <Match when={message().value.type}>
              <MessageAttachment message={message()} />
            </Match>
            <Match when={message().value.role === 'user'}>
              <MessageQuestion
                message={message()}
                onUpdate={onRegenerate}
                childrenIds={p.childrenIds}
              />
            </Match>
            <Match when={message().value.role === 'assistant'}>
              <MessageAnswer
                message={message()}
                onRegenerate={onRegenerate}
                childrenIds={p.childrenIds}
              />
            </Match>
          </Switch>
          <Show when={message().childrenIds.length}>
            <MessageTree id={message().id} childrenIds={message().childrenIds} />
          </Show>
        </>
      )}
    </Show>
  )

  return (
    <Container ref={containerRef} data-testid="chat">
      <ButtonGroup>
        <Threads onChange={props.onChangeThread} />
        <Show when={threadService.currentThread?.messages?.length}>
          <Button onClick={onNewThread}>
            <IconAdd /> New
          </Button>
        </Show>
        <ModelSelect onChange={() => focusInput()} />
      </ButtonGroup>
      <Messages data-testid="messages">
        <Show when={threadService.messageTree.rootItemIds.length} fallback={<Empty />}>
          <MessageTree id={undefined} childrenIds={threadService.messageTree.rootItemIds} />
        </Show>
      </Messages>
      <Show when={focus()} keyed>
        <ChatInput ref={inputRef} dropArea={props.scrollContent} onMessage={onInputMessage} />
      </Show>
      <Suggestions onSuggestion={onInputMessage} />
      <Show when={!autoScrolling()}>
        <ScrollDown>
          <IconButton onClick={() => scrollToBottom()}>
            <IconKeyboardArrowDown />
          </IconButton>
        </ScrollDown>
      </Show>
    </Container>
  )
}
