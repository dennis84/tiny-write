import {Compartment, EditorState, Transaction} from '@codemirror/state'
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

    const langCompartment = new Compartment()
    const copilotApplyCompartment = new Compartment()

    const parseInfo = () => {
      let lang: string | undefined
      let attrs: string | undefined
      if (p.item.openNode.info) {
        const arr = p.item.openNode.info.split(/(\s+)/g)
        lang = arr[0]
        attrs = arr.slice(2).join('')
      }

      return {lang, attrs}
    }

    createEffect(() => {
      let view = editorView()
      if (!view) {
        const info = parseInfo()
        const theme = getTheme(configService.codeTheme.value)
        const lang = getLanguageConfig(info.lang)
        const doc = p.item.openNode.content.replace(/\n$/, '')
        const attrs = parseCodeBlockAttrs(info.attrs ?? '')

        view = new EditorView({
          parent: ref,
          doc,
          extensions: [
            EditorState.readOnly.of(true),
            EditorView.lineWrapping,
            theme,
            langCompartment.of(lang.highlight()),
            clipPlugin,
            copilotApplyCompartment.of(copilotApply(attrs.id, attrs.range, attrs.file)),
          ],
        })

        setEditorView(view)
      } else {
        // Remove if content is shorter than doc. Happens when AI closes a code fence:
        // chunk: ``
        // chunk: `\n\n
        const content = p.item.openNode.content.replace(/\n$/, '')
        const docLen = view.state.doc.length
        const from = Math.min(content.length, docLen)

        // Reconfigure plugins because highlight infos comes after open fence:
        // chunk: ```
        // chunk: typescript\n
        const info = parseInfo()
        const lang = getLanguageConfig(info.lang)
        const attrs = parseCodeBlockAttrs(info.attrs ?? '')

        view.dispatch({
          changes: {from, to: docLen, insert: content.slice(from)},
          annotations: Transaction.addToHistory.of(false),
          effects: [
            langCompartment.reconfigure(lang.highlight()),
            copilotApplyCompartment.reconfigure(copilotApply(attrs.id, attrs.range, attrs.file)),
          ],
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
        when={p.node.value.openNode.tag}
        fallback={<MarkdownTree childrenIds={p.node.childrenIds} />}
      >
        <Dynamic component={p.node.value.openNode.tag}>
          <MarkdownTree childrenIds={p.node.childrenIds} />
        </Dynamic>
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
