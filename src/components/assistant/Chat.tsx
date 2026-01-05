import {WheelGesture} from '@use-gesture/vanilla'
import type {EditorView} from 'prosemirror-view'
import {createSignal, Match, onCleanup, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import type {Chunk} from '@/services/CopilotService'
import {useState} from '@/state'
import {type Message, Page} from '@/types'
import {Button, ButtonGroup, IconButton} from '../Button'
import {IconAdd, IconKeyboardArrowDown, IconKeyboardArrowUp} from '../Icon'
import {ChatInput} from './ChatInput'
import {MessageAnswer} from './MessageAnswer'
import {MessageQuestion} from './MessageQuestion'
import {ModelSelect} from './ModelSelect'
import {Threads} from './Threads'

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 100%;
`

const Messages = styled('div')`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
`

const ScrollDown = styled('span')`
  position: fixed;
  bottom: 20px;
  right: 20px;
  margin-left: auto;
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

  const {store, configService, copilotService, threadService, toastService} = useState()
  const [editorView, setEditorView] = createSignal<EditorView>()
  const [isAtBottom, setIsAtBottom] = createSignal(false)

  const scrollToBottom = () => {
    const top = props.scrollContent().scrollHeight + 100
    props.scrollContent().scrollTo({top, behavior: 'smooth'})
    setIsAtBottom(true)
  }

  const scrollToTop = () => {
    props.scrollContent().scrollTo({top: 0, behavior: 'smooth'})
    setIsAtBottom(false)
  }

  const focusInput = () => {
    editorView()?.focus()
    setIsAtBottom(true)
  }

  const addUserMessage = async (input: Message) => {
    if (!input.content && !input.attachments) return
    await threadService.addMessage(input)
  }

  const sendMessages = async () => {
    const currentThread = threadService.currentThread

    const {messages, nextId, parentId} = threadService.getMessages()
    if (!currentThread || !messages) return

    const messageId = nextId ?? uuidv4()

    // Create answer message directly to visualize loading
    threadService.addChunk(messageId, parentId, '')
    scrollToBottom()

    try {
      await copilotService.completions(
        messages,
        (chunk: Chunk) => {
          for (const choice of chunk.choices) {
            const chunk = choice.delta?.content ?? choice.message?.content ?? ''
            threadService.addChunk(messageId, parentId, chunk)
          }
        },
        async () => {
          await threadService.saveThread()

          if (!currentThread.title) {
            try {
              const title = await threadService.generateTitle()
              if (title) await threadService.updateTitle(title)
            } catch {
              // ignore
            }
          }
        },
        () => {
          threadService.interrupt(messageId)
        },
      )
    } catch (error: any) {
      toastService.open({message: error?.message ?? error, action: 'Close'})
    }
  }

  const onInputMessage = async (message: Message) => {
    await addUserMessage(message)
    focusInput()
    if (message.role === 'user') {
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
      ({event, velocity: [_, y]}) => {
        // Only on user input not programmatic scroll
        if (!event.deltaY) return
        if (Math.abs(y) < 0.5) return

        const newValue =
          props.scrollContent().scrollHeight -
            props.scrollContent().scrollTop -
            props.scrollContent().clientHeight <
          90 // ~ the height of the input area

        setIsAtBottom(newValue)
      },
      {threshold: 10}, // Ignore scrolls smaller than 10px
    )

    onCleanup(() => {
      gesture.destroy()
    })
  })

  const MessageTree = (p: {id?: string; childrenIds: string[]}) => (
    <Show when={threadService.getNextItem(p.id, p.childrenIds)}>
      {(message) => (
        <>
          <Switch>
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
        <Show when={threadService.messageTree.rootItemIds.length}>
          <MessageTree id={undefined} childrenIds={threadService.messageTree.rootItemIds} />
        </Show>
      </Messages>
      {/* Rerender if code theme has been changed */}
      <Show when={configService.codeTheme} keyed>
        <ChatInput
          ref={inputRef}
          setEditorView={(view) => setEditorView(view)}
          dropArea={props.scrollContent}
          onMessage={onInputMessage}
        />
      </Show>
      <Show when={!isAtBottom()}>
        <ScrollDown>
          <IconButton onClick={() => scrollToBottom()}>
            <IconKeyboardArrowDown />
          </IconButton>
        </ScrollDown>
      </Show>
      <Show when={store.location?.page === Page.Assistant && isAtBottom()}>
        <ScrollDown>
          <IconButton onClick={() => scrollToTop()}>
            <IconKeyboardArrowUp />
          </IconButton>
        </ScrollDown>
      </Show>
    </Container>
  )
}
