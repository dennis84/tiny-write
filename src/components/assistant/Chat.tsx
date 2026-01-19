import type {EditorView} from 'prosemirror-view'
import {createMemo, createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import type {Chunk} from '@/services/CopilotService'
import {useState} from '@/state'
import type {TreeItem} from '@/tree'
import {type Attachment, type Message, Page} from '@/types'
import {Button, ButtonGroup} from '../Button'
import {TooltipDivider} from '../dialog/Tooltip'
import {IconAdd} from '../Icon'
import {Content, Scroll} from '../Layout'
import {AutoContextToggle} from './attachments/AutoContextToggle'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {ChatInput} from './ChatInput'
import {MessageAnswer} from './MessageAnswer'
import {MessageQuestion} from './MessageQuestion'
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

const EmptyContainer = styled('div')`
  width: 100%;
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
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

  const onAttachment = (attachment: Attachment) => {
    threadService.addAttachment(attachment)
  }

  const MessagePair = styled('div')`
    &:last-child {
      min-height: calc(100vh - 220px); /* 50px topnav + 20px margin + 150 bottom padding */
      margin-bottom: 150px;
    }
  `

  const messages = createMemo(() => {
    type MessagePair = {
      question: TreeItem<Message>
      answer: TreeItem<Message>
      questionSiblings: string[]
    }

    const result: MessagePair[] = []
    let question: TreeItem<Message> | undefined
    let parent: TreeItem<Message> | undefined
    let questionSiblings: string[] = []

    threadService.traverseTree((item) => {
      if (item.value.role === 'user') {
        questionSiblings = parent?.childrenIds ?? threadService.messageTree.rootItemIds
        question = item
      } else if (item.value.role === 'assistant' && question) {
        result.push({question, answer: item, questionSiblings})
        question = undefined
      }

      parent = item
    })

    return result
  })

  return (
    <>
      <Scroll ref={scrollContentRef} data-testid="chat_scroll">
        <Content
          style={
            store.location?.page !== Page.Assistant
              ? {
                  'max-width': '100%',
                  'padding-bottom': '0',
                }
              : {
                  'padding-bottom': '0',
                }
          }
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
            </ButtonGroup>
            <Messages data-testid="messages">
              <For each={messages()}>
                {({question, answer, questionSiblings}) => (
                  <MessagePair>
                    <MessageQuestion
                      message={question}
                      onUpdate={onRegenerate}
                      childrenIds={questionSiblings}
                    />
                    <MessageAnswer
                      message={answer}
                      onRegenerate={onRegenerate}
                      childrenIds={question.childrenIds}
                    />
                  </MessagePair>
                )}
              </For>
            </Messages>
            <Show when={!threadService.messageTree.rootItemIds.length}>
              <EmptyContainer>
                <Show when={!store.ai?.autoContext}>
                  <CurrentFileButton onAttachment={onAttachment} />
                  <SelectionButton onAttachment={onAttachment} />
                  <TooltipDivider />
                </Show>
                <AutoContextToggle />
              </EmptyContainer>
            </Show>
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
