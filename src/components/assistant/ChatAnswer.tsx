import {createEffect, createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import markdownit from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {EditorView, Panel, showPanel} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, useState} from '@/state'
import {copy} from '@/remote/clipboard'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {IconButton} from '../Button'
import {Icon, IconCopilot} from '../Icon'
import {chatBubble} from './Style'
import {parseCodeBlockAttrs} from './util'

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

const streamMd = markdownit({html: true})

interface MessageEditor {
  elementId: string
  doc: string
  lang?: string
  id?: string
  range?: [number, number]
}

interface Props {
  message: Message
  streaming?: boolean
  onBubbleMenu?: (event: MouseEvent, message: Message) => void
}

export const ChatAnswer = (props: Props) => {
  const {codeService, configService, fileService} = useState()
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [html, setHtml] = createSignal<string>()

  const finalMd = markdownit({
    html: true,
    highlight: (doc: string, lang: string, attrs: string) => {
      const elementId = uuidv4()
      const parent = document.createElement('pre')
      parent.id = elementId
      parent.className = 'cm-rendered'
      const attributes = parseCodeBlockAttrs(attrs)
      setMessageEditors((prev) => [...prev, {elementId, doc, lang, ...attributes}])
      return parent.outerHTML
    },
  }).use(iterator, 'url_new_win', 'link_open', (tokens: any, idx: any) => {
    tokens[idx].attrPush(['target', '_blank'])
  })

  const renderMessageEditors = () => {
    const editors = messageEditors()
    for (const ed of editors ?? []) {
      const parent = document.getElementById(ed.elementId)
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
          copilotApply(ed.id, ed.range),
        ],
      })
    }

    setMessageEditors([])
  }

  const applyPanel =
    (id?: string, range?: [number, number]) =>
    (view: EditorView): Panel => {
      let dom = document.createElement('div')
      dom.classList.add('copilot-panel')

      const file = id ? fileService.findFileById(id) : undefined
      const title = document.createElement('span')
      title.textContent = ''
      fileService.getTitle(file).then((value) => {
        const t = range ? `${value}:${range[0]}-${range[1]}` : value
        title.textContent = t
      })
      dom.appendChild(title)

      const copyButton = document.createElement('button')
      copyButton.textContent = 'Copy'
      copyButton.addEventListener('click', () => {
        copy(view.state.doc.toString())
      })
      dom.appendChild(copyButton)

      if (file) {
        const apply = document.createElement('button')
        apply.textContent = 'Apply'
        apply.addEventListener('click', () => {
          codeService.merge(file, view.state.doc.toString(), range)
        })
        dom.appendChild(apply)
      }

      return {top: true, dom}
    }

  const copilotApply = (id?: string, range?: [number, number]) =>
    showPanel.of(applyPanel(id, range))

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
          <IconButton onClick={(e) => props.onBubbleMenu?.(e, props.message)}>
            <Icon>more_vert</Icon>
          </IconButton>
        </BubbleMenu>
      </Show>
    </AnswerBubble>
  )
}
