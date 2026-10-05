import type Token from 'markdown-it/lib/token.mjs'
import {Show} from 'solid-js'
import {copy} from '@/remote/clipboard'
import {useState} from '@/state'
import type {TreeItem} from '@/tree'
import {AttachmentType, type Message} from '@/types'
import {ButtonGroup, ButtonSpan, IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {Spinner} from '../icons/Spinner'
import {IconCopy, IconHand, IconRefresh} from '../icons/Ui'
import {AttachmentChip} from './attachments/AttachmentChip'
import {MessageMarkdown} from './MessageMarkdown'
import {ModelSelect} from './ModelSelect'
import {Pagination} from './Pagination'
import {ChatBubble} from './Style'
import {Thinking} from './tools/Thinking'

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
  const {aiService, configService} = useState()

  const onCopy = () => copy(props.message.value.content)

  const onRegenerate = () => {
    props.onRegenerate?.(props.message.value)
  }

  return (
    <ChatBubble fadeIn={aiService.streaming() !== undefined} data-testid="answer_bubble">
      <Thinking message={props.message.value} />
      {/* Rerender code blocks if code theme has been changed */}
      <Show when={configService.codeTheme} keyed>
        <MessageMarkdown content={props.message.value.content} />
      </Show>
      <ButtonGroup>
        <TooltipHelp title="Copy">
          <IconButton onClick={onCopy}>
            <IconCopy />
          </IconButton>
        </TooltipHelp>
        <TooltipHelp title="Regenerate">
          <IconButton onClick={onRegenerate} data-testid="regenerate">
            <IconRefresh />
          </IconButton>
        </TooltipHelp>
        <Show when={aiService.streaming() && props.message.childrenIds.length === 0}>
          <IconButton>
            <Spinner />
          </IconButton>
        </Show>
        <Show when={props.message.value.model}>
          {(model) => <ModelSelect value={model()} onChange={onRegenerate} />}
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
