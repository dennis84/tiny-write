import {createEffect, createSignal, For, Show, untrack} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import markdownit from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {EditorView, Panel, showPanel} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {IconButton} from '../Button'
import {IconAiAssistant, IconClose, IconMoreVert, Spinner} from '../Icon'
import {Tooltip} from '../Tooltip'
import {chatBubble} from './Style'
import {parseCodeBlockAttrs} from './util'
import {ApplyPanel, ApplyPanelState} from './ApplyPanel'

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
  elementId: string
  doc: string
  lang?: string
  id?: string
  range?: [number, number]
}

interface Props {
  message: Message
  onBubbleMenu?: (event: MouseEvent, message: Message) => void
}

export const MessageAnswer = (props: Props) => {
  const {configService, threadService} = useState()
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [html, setHtml] = createSignal<string>()
  const [applyPanels, setApplyPanels] = createSignal<ApplyPanelState[]>([])
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()

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
    (editorView: EditorView): Panel => {
      let dom = document.createElement('div')
      return {
        top: true,
        dom,
        mount: () => {
          setApplyPanels((prev) => [...prev, {dom, editorView, id, range}])
        },
      }
    }

  const copilotApply = (id?: string, range?: [number, number]) =>
    showPanel.of(applyPanel(id, range))

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
    setHtml(finalMd.render(props.message.content))
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
      <AnswerBubble>
        <AnswerBadge>
          <IconAiAssistant /> Assistant:
        </AnswerBadge>
        <Html content={html() ?? props.message.content} />
        <Show when={props.message?.streaming}>
          <p>
            <Spinner />
          </p>
        </Show>
        <Show when={props.message !== undefined}>
          <BubbleMenu>
            <IconButton onClick={onBubbleMenu}>
              <IconMoreVert />
            </IconButton>
          </BubbleMenu>
        </Show>
        <For each={applyPanels()}>{(s) => <ApplyPanel state={s} />}</For>
      </AnswerBubble>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={closeBubbleMenu} backdrop={true}>
          <div onClick={onRemoveMessage}>
            <IconClose />
            Remove message
          </div>
        </Tooltip>
      </Show>
    </>
  )
}
