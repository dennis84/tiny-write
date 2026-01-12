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
import {Content, Scroll} from '../Layout'

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

interface Props {
  onChangeThread: (id: string) => void
}

export const Chat = (props: Props) => {
  let inputRef!: HTMLDivElement
  let containerRef!: HTMLDivElement
  let scrollContentRef!: HTMLDivElement

  const {store, configService, copilotService, threadService, toastService} = useState()
  const [editorView, setEditorView] = createSignal<EditorView>()

  const focusInput = () => {
    editorView()?.focus()
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
    <>
      <Scroll ref={scrollContentRef} data-testid="chat_scroll">
        <Content
          style={store.location?.page !== Page.Assistant ? {
            'max-width': '100%',
            'padding-bottom': 'calc(100vh - 100px)',
          } : {}}
          data-testid="chat_content"
        >
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

            {/* <Show when={!threadService.messageTree.rootItemIds.length}> */}
            {/*   <EmptyContainer> */}
            {/*     <Show when={!store.ai?.autoContext}> */}
            {/*       <CurrentFileButton onAttachment={onAttachment} /> */}
            {/*       <SelectionButton onAttachment={onAttachment} /> */}
            {/*       <TooltipDivider /> */}
            {/*     </Show> */}
            {/*     <AutoContextToggle /> */}
            {/*   </EmptyContainer> */}
            {/* </Show> */}
          </Container>
        </Content>
      </Scroll>
      {/* Rerender if code theme has been changed */}
      <Show when={configService.codeTheme} keyed>
        <ChatInput
          ref={inputRef}
          setEditorView={(view) => setEditorView(view)}
          dropArea={() => scrollContentRef}
          onMessage={onInputMessage}
        />
      </Show>
    </>
  )
}
