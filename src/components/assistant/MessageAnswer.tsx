import {createEffect, createSignal, For, Match, onMount, Show, Switch, untrack} from 'solid-js'
import {styled} from 'solid-styled-components'
import markdownit, {type Token} from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {EditorView, type Panel, showPanel} from '@codemirror/view'
import {EditorState, Transaction} from '@codemirror/state'
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
import {createStore} from 'solid-js/store'
import {createSequentialEffect} from '@/hooks/sequential-effect'

const AnswerBubble = styled('div')`
  ${chatBubble}
`

interface TokenResult {
  token: Token
  editorView?: EditorView
}

interface TokenStore {
  tokens: TokenResult[]
}

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onRegenerate?: (message: Message) => void
}

export const MessageAnswer = (props: Props) => {
  const {configService} = useState()
  const [applyPanels, setApplyPanels] = createSignal<ApplyPanelState[]>([])
  const [tokenStore, setTokenStore] = createStore<TokenStore>({tokens: []})

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

  const renderMessage = async (content: string) => {
    const tokens = md.parse(content, undefined)

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token.type === 'fence') {
        const editorView = tokenStore.tokens[i]?.editorView
        if (editorView) {
          const from = editorView.state.doc.length
          const insert = token.content.slice(from)

          editorView.dispatch({
            changes: {from, insert},
            annotations: Transaction.addToHistory.of(false),
          })
        } else {
          setTokenStore('tokens', i, {token})
        }
      } else {
        setTokenStore('tokens', i, {token})
      }
    }
  }

  createSequentialEffect(
    () => props.message.value.content,
    async (content) => {
      await renderMessage(content)
    },
  )

  const CodeFence = (p: {index: number; token: Token}) => {
    let ref!: HTMLDivElement

    onMount(() => {
      let langStr: string | undefined
      let attrsStr: string | undefined
      if (p.token.info) {
        const arr = p.token.info.split(/(\s+)/g)
        langStr = arr[0]
        attrsStr = arr.slice(2).join('')
      }

      const theme = getTheme(configService.codeTheme.value)
      const lang = getLanguageConfig(langStr)
      const doc = p.token.content.replace(/\n$/, '')
      const attrs = parseCodeBlockAttrs(attrsStr ?? '')

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

      untrack(() => setTokenStore('tokens', p.index, {editorView}))
    })

    return <div class="fence-container" ref={ref} />
  }

  const Html = (p: {token: Token}) => {
    let ref!: HTMLDivElement
    createEffect(() => {
      const html = md.renderer.render([p.token], md.options, {})
      ref.innerHTML = html
    })

    return <div class="html-container" ref={ref} />
  }

  return (
    <AnswerBubble data-testid="answer_bubble">
      <For each={tokenStore.tokens}>
        {(element, index) => (
          <Switch>
            <Match when={element.token.type === 'fence'}>
              <CodeFence index={index()} token={element.token} />
            </Match>
            <Match when={true}>
              <Html token={element.token} />
            </Match>
          </Switch>
        )}
      </For>
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
