import {createEffect, createSignal, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import markdownit from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import container from 'markdown-it-container'
import {EditorView} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {IconButton} from '../Button'
import {Icon, IconCopilot} from '../Icon'
import {Tooltip} from '../Tooltip'

const chatBubble = `
  position: relative;
  flex-basis: 100%;
  margin-bottom: 20px;
  border-radius: var(--border-radius);
  font-size: var(--menu-font-size);
  .cm-editor {
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    border-radius: var(--border-radius);
  }
  .cm-gap {
    display: none;
  }
  pre:not(.cm-rendered) {
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    padding: 5px;
  }
  a {
    color: var(--primary-background);
  }
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  max-width: 80%;
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

const AnswerBubble = styled('div')`
  ${chatBubble}
`

const AnswerBadge = styled('span')`
  background: var(--primary-background);
  color: var(--primary-foreground);
  border-radius: var(--border-radius);
  padding: 2px;
  display: inline-flex;
  align-items: center;
  margin-bottom: 10px;
  .icon {
    margin-right: 5px;
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
  streaming?: boolean
}

export const ChatMessage = (props: Props) => {
  const {configService, threadService} = useState()
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [html, setHtml] = createSignal<string>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()

  const streamMd = markdownit({html: true})

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
  })
    .use(iterator, 'url_new_win', 'link_open', (tokens: any, idx: any) => {
      tokens[idx].attrPush(['target', '_blank'])
    })
    .use(container, 'details', {
      render: (tokens: any, idx: any) => {
        const detailsInfo = tokens[idx].info.trim().match(/^details\s+(.*)$/)
        const detailsTitle = detailsInfo ? `${detailsInfo[1]}` : ''
        if (tokens[idx].nesting === 1) {
          return '<details><summary>' + finalMd.utils.escapeHtml(detailsTitle) + '</summary>\n'
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
      const doc = ed.doc.trim()

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

  createEffect(() => {
    if (props.streaming) {
      setHtml(streamMd.render(props.message.content))
    } else {
      setHtml(finalMd.render(props.message.content))
    }
  })

  const Html = (p: {content: string}) => {
    let ref!: HTMLDivElement
    onMount(() => {
      ref.innerHTML = p.content
      renderMessageEditors()
    })

    return <div class="html-container" ref={ref} />
  }

  const Question = () => {
    return (
      <QuestionBubble>
        <Html content={html() ?? props.message.content} />
        <div>
          {props.message.error ? ` (This question has errors: ${props.message.error})` : ''}
        </div>
        <BubbleMenu>
          <IconButton onClick={onBubbleMenu}>
            <Icon>more_vert</Icon>
          </IconButton>
        </BubbleMenu>
      </QuestionBubble>
    )
  }

  const Answer = () => {
    return (
      <AnswerBubble>
        <AnswerBadge>
          <IconCopilot /> Assistant:
        </AnswerBadge>
        <Show when={props.message?.content === ''}>
          <div>Loading ...</div>
        </Show>
        <Show when={props.message?.content !== ''}>
          <Html content={html() ?? props.message.content} />
        </Show>
        <Show when={props.message !== undefined}>
          <BubbleMenu>
            <IconButton onClick={onBubbleMenu}>
              <Icon>more_vert</Icon>
            </IconButton>
          </BubbleMenu>
        </Show>
      </AnswerBubble>
    )
  }

  return (
    <>
      <Switch>
        <Match when={props.message.role === 'user'}>
          <Question />
        </Match>
        <Match when={props.message.role === 'assistant'}>
          <Answer />
        </Match>
      </Switch>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={closeBubbleMenu} backdrop={true}>
          <div onClick={onRemoveMessage}>
            <Icon>close</Icon>
            Remove message
          </div>
        </Tooltip>
      </Show>
    </>
  )
}
