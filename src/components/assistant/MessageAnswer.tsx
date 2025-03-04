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
import {copy} from '@/remote/clipboard'
import {TreeItem} from '@/tree'
import {ButtonGroup, IconButton} from '../Button'
import {IconAiAssistant, IconContentCopy, IconRefresh, Spinner} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {chatBubble} from './Style'
import {parseCodeBlockAttrs} from './util'
import {ApplyPanel, ApplyPanelState} from './ApplyPanel'
import {Pagination} from './Pagination'

const AnswerBubble = styled('div')`
  ${chatBubble}
`

interface MessageEditor {
  elementId: string
  doc: string
  lang?: string
  id?: string
  file?: string
  range?: [number, number]
}

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onRegenerate?: (message: Message) => void
}

export const MessageAnswer = (props: Props) => {
  const {configService} = useState()
  const [messageEditors, setMessageEditors] = createSignal<MessageEditor[]>([])
  const [html, setHtml] = createSignal<string>()
  const [applyPanels, setApplyPanels] = createSignal<ApplyPanelState[]>([])

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
          copilotApply(ed.id, ed.range, ed.file),
        ],
      })
    }

    setMessageEditors([])
  }

  const applyPanel =
    (id?: string, range?: [number, number], file?: string) =>
    (editorView: EditorView): Panel => {
      let dom = document.createElement('div')
      return {
        top: true,
        dom,
        mount: () => {
          setApplyPanels((prev) => [...prev, {dom, editorView, id, range, file}])
        },
      }
    }

  const copilotApply = (id?: string, range?: [number, number], file?: string) =>
    showPanel.of(applyPanel(id, range, file))

  const onCopy = () => copy(props.message.value.content)

  const onRegenerate = () => {
    props.onRegenerate?.(props.message.value)
  }

  createEffect(() => {
    setHtml(finalMd.render(props.message.value.content))
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
    <AnswerBubble data-testid="answer_bubble">
      <div>
        <IconAiAssistant />
      </div>
      <Html content={html() ?? props.message.value.content} />
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
      <For each={applyPanels()}>{(s) => <ApplyPanel state={s} />}</For>
    </AnswerBubble>
  )
}
