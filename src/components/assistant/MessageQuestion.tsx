import {createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import type {Message} from '@/state'
import type {TreeItem} from '@/tree'
import {ButtonGroup, IconButton} from '../Button'
import {IconEditSquare} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {MessageInput} from './MessageInput'
import {MessageMarkdown} from './MessageMarkdown'
import {Pagination} from './Pagination'
import {chatBubble} from './Style'

const EditBubble = styled('div')`
  flex-basis: 100%;
`

const QuestionContainer = styled('div')`
  justify-items: flex-end;
  margin-left: auto;
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  padding: 20px;
  background: var(--foreground-10);
  white-space: pre-wrap;
  width: fit-content;
  margin-left: 0;
  .cm-editor {
    margin-top: 10px;
  }
`

const QuestionAttachments = styled('div')`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  img {
    margin-top: 10px;
    border-radius: var(--border-radius);
    max-width: 100px;
    max-height: 100px;
  }
`

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onUpdate?: (message: Message) => void
}

export const MessageQuestion = (props: Props) => {
  const [editing, setEditing] = createSignal(false)

  const onEditMessage = async () => {
    setEditing(true)
  }

  const onUpdate = (message: Message) => {
    setEditing(false)
    props.onUpdate?.(message)
  }

  return (
    <>
      <Show when={editing()}>
        <EditBubble>
          <MessageInput
            onUpdate={onUpdate}
            onCancel={() => setEditing(false)}
            message={props.message.value}
          />
        </EditBubble>
      </Show>
      <Show when={!editing()}>
        <QuestionContainer>
          <QuestionBubble data-testid="question_bubble">
            <MessageMarkdown content={props.message.value.content} />
          </QuestionBubble>
          <QuestionAttachments>
            <For each={props.message.value.attachments}>
              {(attachment) => <img src={attachment.data} alt="" />}
            </For>
          </QuestionAttachments>
          <ButtonGroup>
            <Pagination
              id={props.message.id}
              parentId={props.message.parentId}
              childrenIds={props.childrenIds}
            />
            <TooltipHelp title="Edit message">
              <IconButton onClick={onEditMessage}>
                <IconEditSquare />
              </IconButton>
            </TooltipHelp>
          </ButtonGroup>
        </QuestionContainer>
      </Show>
    </>
  )
}
