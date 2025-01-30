import {createEffect, createSignal, Show, untrack} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import markdownit from 'markdown-it'
import container from 'markdown-it-container'
import {EditorView} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {IconButton} from '../Button'
import {IconClose, IconEdit, IconMoreVert} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'
import {chatBubble} from './Style'
import {MessageInput} from './MessageInput'

const EditBubble = styled('div')`
  flex-basis: 100%;
  margin-bottom: 20px;
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  padding: 20px;
  justify-self: flex-end;
  margin-left: auto;
  background: var(--foreground-10);
  .html-container {
    > p:first-child {
      margin-top: 0;
    }
    > p:last-child {
      margin-bottom: 0;
    }
  }
`

const BubbleMenu = styled('div')`
  position: absolute;
  top: 5px;
  right: 5px;
`

interface MessageEditor {
  id: string
  doc: string
  lang: string
}

interface Props {
  message: Message
}

export const MessageQuestion = (props: Props) => {
  const {configService, threadService} = useState()
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [html, setHtml] = createSignal<string>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()
  const [editing, setEditing] = createSignal(false)

  const finalMd = markdownit({
    html: true,
    highlight: (doc: string, lang: string) => {
      const id = uuidv4()
      const parent = document.createElement('pre')
      parent.id = id
      parent.className = 'cm-rendered'
      setMessageEditors((prev) => [...prev, {id, doc, lang}])
      return parent.outerHTML
    },
  }).use(container, 'details', {
    render: (tokens: any, idx: any) => {
      const detailsInfo = tokens[idx].info.trim().match(/^details\s+(.*)$/)
      const detailsTitle = detailsInfo ? `${detailsInfo[1]}` : ''
      if (tokens[idx].nesting === 1) {
        return `<details><summary>${finalMd.utils.escapeHtml(detailsTitle)}</summary>\n`
      } else {
        return '</details>\n'
      }
    },
  })

  const renderMessageEditors = () => {
    const editors = messageEditors()
    for (const ed of editors ?? []) {
      const parent = document.getElementById(ed.id)
      if (!parent) return

      const theme = getTheme(configService.codeTheme.value)
      const lang = getLanguageConfig(ed.lang)
      const doc = ed.doc.replace(/\n$/, '')

      new EditorView({
        parent,
        doc,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          theme,
          lang.highlight(),
        ],
      })
    }

    setMessageEditors([])
  }

  const onBubbleMenu = (event: MouseEvent) => {
    setTooltipAnchor(event.target as HTMLElement)
  }

  const closeBubbleMenu = () => {
    setTooltipAnchor(undefined)
  }

  const onRemoveMessage = async () => {
    await threadService.removeMessage(props.message)
    closeBubbleMenu()
  }

  const onEditMessage = async () => {
    closeBubbleMenu()
    setEditing(true)
  }

  const onUpdate = (message: Message) => {
    threadService.updateMessage(message)
    setEditing(false)
  }

  createEffect(() => {
    if (!editing()) setHtml(finalMd.render(props.message.content))
  })

  const Html = (p: {content: string}) => {
    let ref!: HTMLDivElement
    createEffect(() => {
      ref.innerHTML = p.content
      untrack(() => renderMessageEditors())
    })

    return <div class="html-container" ref={ref} />
  }

  return (
    <>
      <Show when={editing()}>
        <EditBubble>
          <MessageInput
            onUpdate={onUpdate}
            onCancel={() => setEditing(false)}
            message={props.message}
          />
        </EditBubble>
      </Show>
      <Show when={!editing()}>
        <QuestionBubble>
          <Html content={html() ?? props.message.content} />
          <BubbleMenu>
            <IconButton onClick={onBubbleMenu}>
              <IconMoreVert />
            </IconButton>
          </BubbleMenu>
        </QuestionBubble>
      </Show>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={closeBubbleMenu} backdrop={true}>
          <TooltipButton onClick={onRemoveMessage}>
            <IconClose />
            Remove message
          </TooltipButton>
          <TooltipButton onClick={onEditMessage}>
            <IconEdit />
            Edit message
          </TooltipButton>
        </Tooltip>
      </Show>
    </>
  )
}
