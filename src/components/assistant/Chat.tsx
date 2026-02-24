import {createMemo, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import type {TreeItem} from '@/tree'
import type {Attachment, Message} from '@/types'
import {TooltipDivider} from '../dialog/Style'
import {AutoContextToggle} from './attachments/AutoContextToggle'
import {CurrentFileButton} from './attachments/CurrentFile'
import {SelectionButton} from './attachments/Selection'
import {MessageAnswer} from './MessageAnswer'
import {MessageQuestion} from './MessageQuestion'

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

export const Chat = () => {
  let containerRef!: HTMLDivElement

  const {store, threadService} = useState()

  const onRegenerate = (message: Message) => {
    threadService.regenerate(message)
    void threadService.sendMessages()
  }

  const onAttachment = (attachment: Attachment) => {
    threadService.addAttachment(attachment)
  }

  const MessagePair = styled('div')`
    display: flex;
    flex-direction: column;
    &:last-child {
      min-height: calc(100vh - 270px); /* 50px topnav + 20px margin + 200 bottom padding */
      margin-bottom: 200px;
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
    <Container ref={containerRef} data-testid="chat">
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
  )
}
