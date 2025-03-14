import {createSignal, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Message} from '@/state'
import {TreeItem} from '@/tree'
import {ButtonGroup, IconButton} from '../Button'
import {IconEditSquare} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {chatBubble} from './Style'
import {MessageInput} from './MessageInput'
import {Pagination} from './Pagination'

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
            {props.message.value.content}
          </QuestionBubble>
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
