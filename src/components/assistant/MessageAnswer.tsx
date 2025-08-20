import type {Token} from 'markdown-it'
import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {copy} from '@/remote/clipboard'
import type {Message} from '@/state'
import type {TreeItem} from '@/tree'
import {ButtonGroup, IconButton} from '../Button'
import {IconContentCopy, IconRefresh, Spinner} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {MessageMarkdown} from './MessageMarkdown'
import {Pagination} from './Pagination'
import {chatBubble} from './Style'

const AnswerBubble = styled('div')`
  ${chatBubble}
`

export interface TokenItem {
  id: string
  parentId?: string
  nodeType: string
  openNode: Token
}

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onRegenerate?: (message: Message) => void
}

export const MessageAnswer = (props: Props) => {
  const onCopy = () => copy(props.message.value.content)

  const onRegenerate = () => {
    props.onRegenerate?.(props.message.value)
  }

  return (
    <AnswerBubble data-testid="answer_bubble">
      <MessageMarkdown content={props.message.value.content} />
      <ButtonGroup>
        <TooltipHelp title="Copy">
          <IconButton onClick={onCopy}>
            <IconContentCopy />
          </IconButton>
        </TooltipHelp>
        <TooltipHelp title="Regenerate">
          <IconButton onClick={onRegenerate}>
            <IconRefresh />
          </IconButton>
        </TooltipHelp>
        <Show when={props.message?.value.streaming}>
          <IconButton>
            <Spinner />
          </IconButton>
        </Show>
        <Pagination
          id={props.message.id}
          parentId={props.message.parentId}
          childrenIds={props.childrenIds}
        />
      </ButtonGroup>
    </AnswerBubble>
  )
}
