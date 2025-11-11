import {createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {type Message, useState} from '@/state'
import type {TreeItem} from '@/tree'
import {ButtonGroup, IconButton} from '../Button'
import {IconEditSquare} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {AttachmentChip} from './AttachmentChip'
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
  padding: 10px 20px;
  background: var(--foreground-10);
  white-space: pre-wrap;
  width: fit-content;
  margin-left: 0;
  .cm-editor {
    margin-top: 10px;
  }
`

const QuestionAttachments = styled('div')`
  margin: 10px 0;
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
    <QuestionAttachments>
      <For each={props.message.value.attachments}>
        {(attachment) => <AttachmentChip attachment={attachment} />}
      </For>
    </QuestionAttachments>
  )

  return (
    <>
      <Show when={editing()}>
        <EditBubble>
          <MessageInput
            onUpdate={onUpdate}
            onCancel={() => setEditing(false)}
            message={props.message.value}
          />
          <Attachments />
        </EditBubble>
      </Show>
      <Show when={!editing()}>
        <QuestionContainer>
          <QuestionBubble data-testid="question_bubble">
            <Show when={configService.codeTheme} keyed>
              <MessageMarkdown content={props.message.value.content} />
            </Show>
          </QuestionBubble>
          <Attachments />
          <ButtonGroup>
            <Pagination
              id={props.message.id}
              parentId={props.message.parentId}
              childrenIds={props.childrenIds}
            />
            <TooltipHelp title="Edit message">
              <IconButton onClick={onEditMessage} data-testid="edit_message">
                <IconEditSquare />
              </IconButton>
            </TooltipHelp>
          </ButtonGroup>
        </QuestionContainer>
      </Show>
    </>
  )
}
