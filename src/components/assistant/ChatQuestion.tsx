import {createEffect, createSignal, onMount} from 'solid-js'
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
import {Icon} from '../Icon'
import {chatBubble} from './Style'

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
  onBubbleMenu?: (event: MouseEvent, message: Message) => void
}

export const ChatQuestion = (props: Props) => {
  const {configService} = useState()
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [html, setHtml] = createSignal<string>()

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

  createEffect(() => {
    setHtml(finalMd.render(props.message.content))
  })

  const Html = (p: {content: string}) => {
    let ref!: HTMLDivElement
    onMount(() => {
      ref.innerHTML = p.content
      renderMessageEditors()
    })

    return <div class="html-container" ref={ref} />
  }

  return (
    <QuestionBubble>
      <Html content={html() ?? props.message.content} />
      <div>{props.message.error ? ` (This question has errors: ${props.message.error})` : ''}</div>
      <BubbleMenu>
        <IconButton onClick={(e) => props.onBubbleMenu?.(e, props.message)}>
          <Icon>more_vert</Icon>
        </IconButton>
      </BubbleMenu>
    </QuestionBubble>
  )
}
