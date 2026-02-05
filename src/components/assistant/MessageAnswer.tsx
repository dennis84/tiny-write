import type {Token} from 'markdown-it'
import {Show} from 'solid-js'
import {copy} from '@/remote/clipboard'
import {useState} from '@/state'
import type {TreeItem} from '@/tree'
import {AttachmentType, type Message} from '@/types'
import {ButtonGroup, ButtonSpan, IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconContentCopy, IconHand, IconRefresh, Spinner} from '../Icon'
import {AttachmentChip} from './AttachmentChip'
import {MessageMarkdown} from './MessageMarkdown'
import {Pagination} from './Pagination'
import {ChatBubble} from './Style'

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
  const {copilotService, configService} = useState()

  const onCopy = () => copy(props.message.value.content)

  const onRegenerate = () => {
    props.onRegenerate?.(props.message.value)
  }

  return (
    <ChatBubble data-testid="answer_bubble">
      {/* Rerender code blocks if code theme has been changed */}
      <Show when={configService.codeTheme} keyed>
        <MessageMarkdown content={props.message.value.content} />
      </Show>
      <ButtonGroup>
        <TooltipHelp title="Copy">
          <IconButton onClick={onCopy}>
            <IconContentCopy />
          </IconButton>
        </TooltipHelp>
        <TooltipHelp title="Regenerate">
          <IconButton onClick={onRegenerate} data-testid="regenerate">
            <IconRefresh />
          </IconButton>
        </TooltipHelp>
        <Show when={copilotService.streaming() && props.message.childrenIds.length === 0}>
          <IconButton>
            <Spinner />
          </IconButton>
        </Show>
        <Pagination
          id={props.message.id}
          parentId={props.message.parentId}
          childrenIds={props.childrenIds}
        />
        <Show when={props.message.value.interrupted}>
          <ButtonSpan>
            <IconHand />
            interrupted
          </ButtonSpan>
        </Show>
        <Show when={props.message.value.summary}>
          <AttachmentChip
            title="Summary"
            attachment={{
              type: AttachmentType.Text,
              content: props.message.value.summary ?? '',
            }}
          />
        </Show>
      </ButtonGroup>
    </ChatBubble>
  )
}
