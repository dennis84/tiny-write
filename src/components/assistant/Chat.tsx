import {createEffect, createSignal, Match, onCleanup, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {ScrollGesture} from '@use-gesture/vanilla'
import {Message, useState} from '@/state'
import {Chunk} from '@/services/CopilotService'
import {IconAdd, IconClose, IconKeyboardArrowDown} from '../Icon'
import {Button, ButtonGroup, IconButton} from '../Button'
import {Drawer} from '../Drawer'
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

const EmptyContainer = styled('div')`
  width: 100%;
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

export const Chat = () => {
  let drawerRef!: HTMLDivElement
  let inputRef!: HTMLDivElement

  const {store, aiService, copilotService, threadService, toastService} = useState()
  const [focus, setFocus] = createSignal(true)
  const [scrollDown, setScrollDown] = createSignal(false)

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
            threadService.streamLastMessage(
              messageId,
              parentId,
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
    threadService.clear()
    focusInput()
  }

  const onNewThread = () => {
    threadService.newThread()
    focusInput()
  }

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  const onRegenerate = (message: Message) => {
    threadService.regenerate(message)
    void sendMessages()
  }

  const onChangeThread = () => {
    focusInput()
    scrollToInput()
  }

  onMount(() => {
    threadService.newThread()
    const gesture = new ScrollGesture(drawerRef, () => {
      const box = inputRef.getBoundingClientRect()
      setScrollDown(box.top > window.innerHeight)
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  createEffect(() => {
    // hide scroll down button if switch to other branch in message tree
    if (threadService.pathMap()) {
      setScrollDown(false)
    }
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
    <Drawer
      ref={drawerRef as any}
      width={aiService.sidebarWidth}
      onResized={onDrawerResized}
      background={10}
      data-tauri-drag-region="true"
      data-testid="ai_assistant_drawer"
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
        <Threads onChange={onChangeThread} />
        <ModelSelect onChange={() => focusInput()} />
      </ButtonGroup>
      <Messages data-testid="messages">
        <Show when={threadService.messageTree.rootItemIds.length} fallback={<Empty />}>
          <MessageTree id={undefined} childrenIds={threadService.messageTree.rootItemIds} />
        </Show>
      </Messages>
      <Show when={focus()} keyed>
        <ChatInput ref={inputRef} onMessage={onInputMessage} />
      </Show>
      <Suggestions onSuggestion={onInputMessage} />
      <Show when={scrollDown()}>
        <ScrollDown>
          <IconButton onClick={() => scrollToInput()}>
            <IconKeyboardArrowDown />
          </IconButton>
        </ScrollDown>
      </Show>
    </Drawer>
  )
}
