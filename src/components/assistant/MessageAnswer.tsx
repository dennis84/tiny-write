import {createEffect, createSignal, For, Index, type JSXElement, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import markdownit from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {EditorView, type Panel, showPanel} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {type Message, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {copy} from '@/remote/clipboard'
import type {TreeItem} from '@/tree'
import {ButtonGroup, IconButton} from '../Button'
import {IconContentCopy, IconRefresh, Spinner} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {chatBubble} from './Style'
import {parseCodeBlockAttrs} from './util'
import {ApplyPanel, type ApplyPanelState} from './ApplyPanel'
import {Pagination} from './Pagination'
import {createStore, reconcile} from 'solid-js/store'
import {toNamespacedPath} from 'path'

const AnswerBubble = styled('div')`
  ${chatBubble}
`

interface ResponseElement {
  element: JSXElement
  editorView?: EditorView
}

interface ResponseStore {
  elements: ResponseElement[]
}

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onRegenerate?: (message: Message) => void
}

export const MessageAnswer = (props: Props) => {
  const {configService} = useState()
  const [applyPanels, setApplyPanels] = createSignal<ApplyPanelState[]>([])
  const [responseStore, setResponseStore] = createStore<ResponseStore>({elements: []})

  const md = markdownit({
    html: true,
  }).use(iterator, 'url_new_win', 'link_open', (tokens: any, idx: any) => {
    tokens[idx].attrPush(['target', '_blank'])
  })

  const applyPanel =
    (id?: string, range?: [number, number], file?: string) =>
    (editorView: EditorView): Panel => {
      const dom = document.createElement('div')
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

  const renderMessage = () => {
  }

  createEffect(() => {
    const tokens = md.parse(props.message.value.content, undefined)
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      let lang: string | undefined
      if (token.type === 'fence') {
        let attrs: string | undefined

        if (token.info) {
          const arr = token.info.split(/(\s+)/g)
          lang = arr[0]
          attrs = arr.slice(2).join('')
        }

        const editorView = responseStore.elements[i]?.editorView
        if (editorView) {
          const from = editorView.state.doc.length
          const insert = token.content.slice(from)
          console.log('Insert: from: ' + from + ', slice: ' + insert)
          editorView.dispatch({changes: {from, insert}})
        } else {
          const element = <CodeFence index={i} content={token.content} lang={lang} attrs={attrs} />
          setResponseStore('elements', i, {element})
        }
      } else {
        const html = md.renderer.render([token], md.options, {})
        const element = <Html content={html} />
        setResponseStore('elements', i, {element})
      }
    }
  })

  const CodeFence = (p: {index: number; content: string; lang?: string; attrs?: string}) => {
    let ref!: HTMLDivElement
    onMount(() => {
      const theme = getTheme(configService.codeTheme.value)
      const lang = getLanguageConfig(p.lang)
      const doc = p.content.replace(/\n$/, '')
      const attrs = parseCodeBlockAttrs(p.attrs ?? '')

      const editorView = new EditorView({
        parent: ref,
        doc,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          theme,
          lang.highlight(),
          copilotApply(attrs.id, attrs.range, attrs.file),
        ],
      })

      setResponseStore('elements', p.index, {editorView})
    })

    return <div class="fence-container" ref={ref} />
  }

  const Html = (p: {content: string}) => {
    let ref!: HTMLDivElement
    onMount(() => {
      ref.innerHTML = p.content
    })

    return <div class="html-container" ref={ref} />
  }

  return (
    <AnswerBubble data-testid="answer_bubble">
      {responseStore.elements.map((e) => e.element)}
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
