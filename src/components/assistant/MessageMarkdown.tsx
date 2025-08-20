import {EditorState, Transaction} from '@codemirror/state'
import {EditorView, type Panel, showPanel} from '@codemirror/view'
import markdownit, {type Token} from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {batch, createEffect, createSignal, For, Match, Show, Switch} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {clipPlugin} from '@/codemirror/clip'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {createSequentialEffect} from '@/hooks/sequential-effect'
import {useState} from '@/state'
import {createTreeStore, type TreeItem} from '@/tree'
import {ApplyPanel, type ApplyPanelState} from './ApplyPanel'
import {parseCodeBlockAttrs} from './util'

export interface TokenItem {
  id: string
  parentId?: string
  nodeType: string
  openNode: Token
}

interface Props {
  content: string
}

export const MessageMarkdown = (props: Props) => {
  const tree = createTreeStore<TokenItem>()
  const {configService} = useState()
  const [applyPanels, setApplyPanels] = createSignal<ApplyPanelState[]>([])

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

  const CodeFence = (p: {item: TokenItem}) => {
    let ref!: HTMLDivElement
    const [editorView, setEditorView] = createSignal<EditorView>()

    createEffect(() => {
      let view = editorView()
      if (!view) {
        let langStr: string | undefined
        let attrsStr: string | undefined
        if (p.item.openNode.info) {
          const arr = p.item.openNode.info.split(/(\s+)/g)
          langStr = arr[0]
          attrsStr = arr.slice(2).join('')
        }

        const theme = getTheme(configService.codeTheme.value)
        const lang = getLanguageConfig(langStr)
        const doc = p.item.openNode.content.replace(/\n$/, '')
        const attrs = parseCodeBlockAttrs(attrsStr ?? '')

        view = new EditorView({
          parent: ref,
          doc,
          extensions: [
            EditorState.readOnly.of(true),
            EditorView.lineWrapping,
            theme,
            lang.highlight(),
            copilotApply(attrs.id, attrs.range, attrs.file),
            clipPlugin,
          ],
        })

        setEditorView(view)
      } else {
        const from = view.state.doc.length
        const insert = p.item.openNode.content.replace(/\n$/, '').slice(from)

        view.dispatch({
          changes: {from, insert},
          annotations: Transaction.addToHistory.of(false),
        })
      }
    })

    return <div class="fence-container" ref={ref} />
  }

  const Inline = (p: {item: TokenItem}) => {
    let ref!: HTMLElement

    createEffect(() => {
      const html = md.renderer.render([p.item.openNode], md.options, {})
      ref.innerHTML = html
    })

    return <span ref={ref} />
  }

  const MarkdownTree = (p: {childrenIds: string[]}) => {
    return (
      <For each={p.childrenIds}>
        {(id) => (
          <Show when={tree.getItem(id)}>
            {(item) => (
              <Switch>
                <Match when={item().value.nodeType === 'fence'}>
                  <CodeFence item={item().value} />
                </Match>
                <Match when={item().value.nodeType === 'inline'}>
                  <Inline item={item().value} />
                </Match>
                <Match when={true}>
                  <MarkdownNode node={item()} />
                </Match>
              </Switch>
            )}
          </Show>
        )}
      </For>
    )
  }

  const MarkdownNode = (p: {node: TreeItem<TokenItem>}) => {
    return (
      <Show
        when={p.node.value.openNode}
        fallback={<MarkdownTree childrenIds={p.node.childrenIds} />}
      >
        {(n) => (
          <Dynamic component={n().tag}>
            <MarkdownTree childrenIds={p.node.childrenIds} />
          </Dynamic>
        )}
      </Show>
    )
  }

  const createTokenItem = (node: Token, parentId: string, tokenIndex: number): TokenItem => ({
    id: tokenIndex.toString(),
    parentId,
    nodeType: node.type.replace('_open', ''),
    openNode: node,
  })

  const renderMessage = (content: string) => {
    const tokens = md.parse(content, undefined)

    batch(() => {
      tree.updateAll([])

      let parent = tree.getItem('root')

      tokens.forEach((token, idx) => {
        // should not happen
        if (!parent) return

        let tmp: TokenItem
        if (token.nesting === 1) {
          tmp = createTokenItem(token, parent.id, idx)
          tree.add(tmp)
          tree.move(tmp.id, parent.id)
          parent = tree.getItem(tmp.id)
        } else if (token.nesting === -1) {
          parent = tree.getItem(parent.parentId ?? 'root')
        } else if (token.nesting === 0) {
          tree.add(createTokenItem(token, parent.id, idx))
        }
      })
    })
  }

  createSequentialEffect(
    () => props.content,
    (content) => {
      renderMessage(content)
    },
  )

  return (
    <>
      <MarkdownTree childrenIds={tree.rootItemIds} />
      <For each={applyPanels()}>{(s) => <ApplyPanel state={s} />}</For>
    </>
  )
}
