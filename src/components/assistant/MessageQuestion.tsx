import {createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import type {TreeItem} from '@/tree'
import type {Message} from '@/types'
import {ButtonGroup, IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconEdit} from '../icons/Ui'
import {AttachmentChip} from './AttachmentChip'
import {MessageInput} from './MessageInput'
import {MessageMarkdown} from './MessageMarkdown'
import {Pagination} from './Pagination'
import {ChatBubble} from './Style'

const QuestionContainer = styled.div`
  display: grid;
  justify-items: flex-end;
  scroll-margin: 20px; /* margin when scrollIntoView */
  gap: 5px;
  .button-group {
    opacity: 0;
    transition: opacity 100ms ease-out 0.1s;
  }
  &:hover {
    .button-group {
      opacity: 1;
    }
  }
`

const QuestionBubble = styled(ChatBubble)`
  padding: 10px 20px;
  background: var(--background-90);
  width: fit-content;
  margin-left: 0;
  .cm-editor {
    margin-top: 10px;
  }
`

const QuestionAttachments = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
`

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onUpdate?: (message: Message) => void
}

export const MessageQuestion = (props: Props) => {
  let questionContainerRef: HTMLDivElement | undefined

  const [editing, setEditing] = createSignal(false)

  const {configService} = useState()

  const onEditMessage = async () => {
    setEditing(true)
  }

  const onUpdate = (message: Message) => {
    setEditing(false)
    props.onUpdate?.(message)
  }

  const Attachments = () => (
    <Show when={props.message.value.attachments?.length}>
      <QuestionAttachments>
        <For each={props.message.value.attachments}>
          {(attachment) => <AttachmentChip attachment={attachment} />}
        </For>
      </QuestionAttachments>
    </Show>
  )

  return (
    <>
      <Show when={editing()}>
        <QuestionContainer>
          <MessageInput
            onUpdate={onUpdate}
            onCancel={() => setEditing(false)}
            message={props.message.value}
          />
          <Attachments />
        </QuestionContainer>
      </Show>
      <Show when={!editing()}>
        <QuestionContainer ref={questionContainerRef}>
          <QuestionBubble data-testid="question_bubble">
            <Show when={configService.codeTheme} keyed>
              <MessageMarkdown content={props.message.value.content} />
            </Show>
          </QuestionBubble>
          <Attachments />
          <ButtonGroup class="button-group">
            <Pagination
              id={props.message.id}
              parentId={props.message.parentId}
              childrenIds={props.childrenIds}
            />
            <TooltipHelp title="Edit message">
              <IconButton onClick={onEditMessage} data-testid="edit_message">
                <IconEdit />
              </IconButton>
            </TooltipHelp>
          </ButtonGroup>
        </QuestionContainer>
      </Show>
    </>
  )
}
