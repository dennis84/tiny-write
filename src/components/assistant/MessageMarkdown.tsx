import {Compartment, EditorState, Transaction} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import markdownit, {type Token} from 'markdown-it'
import iterator from 'markdown-it-for-inline'
import {batch, createEffect, createSignal, For, Index, Match, Show, Switch} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {Dynamic} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {clipPlugin} from '@/codemirror/clip'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {createSequentialEffect} from '@/hooks/create-sequential-effect'
import type {FileBlock, PartialBlock} from '@/services/AiService'
import {useState} from '@/state'
import {createTreeStore, type Tree, type TreeItem} from '@/tree'
import {pause} from '@/utils/promise'
import {CodeBlockHeader} from './CodeBlockHeader'

const CodeBlock = styled.div`
  background: var(--code-background);
  border-radius: var(--border-radius);
`

export interface TokenItem {
  id: string
  parentId?: string
  nodeType: string
  openNode: Token
}

const md = markdownit({
  html: true,
}).use(iterator, 'url_new_win', 'link_open', (tokens: any, idx: any) => {
  tokens[idx].attrPush(['target', '_blank'])
})

const MarkdownNode = (p: {tree: Tree<TokenItem>; node: TreeItem<TokenItem>}) => {
  return (
    <Show
      when={p.node.value.openNode.tag}
      fallback={<MarkdownTree tree={p.tree} childrenIds={p.node.childrenIds} />}
    >
      <Dynamic component={p.node.value.openNode.tag}>
        <MarkdownTree tree={p.tree} childrenIds={p.node.childrenIds} />
      </Dynamic>
    </Show>
  )
}

const MarkdownTree = (p: {tree: Tree<TokenItem>; childrenIds: string[]}) => {
  const parseLang = (item: TokenItem): string | undefined => {
    if (item.openNode.info) {
      const arr = item.openNode.info.split(/(\s+)/g)
      return arr[0]
    }
  }

  return (
    <For each={p.childrenIds}>
      {(id) => (
        <Show when={p.tree.getItem(id)}>
          {(item) => (
            <Switch>
              <Match when={item().value.nodeType === 'fence'}>
                <CodeFence
                  lang={parseLang(item().value)}
                  content={item().value.openNode.content.trim()}
                />
              </Match>
              <Match when={item().value.nodeType === 'inline'}>
                <Inline item={item().value} />
              </Match>
              <Match when={true}>
                <MarkdownNode tree={p.tree} node={item()} />
              </Match>
            </Switch>
          )}
        </Show>
      )}
    </For>
  )
}

interface CodeFenceProps {
  lang?: string
  content: string
}

const CodeFence = (p: CodeFenceProps) => {
  let ref!: HTMLDivElement
  const [editorView, setEditorView] = createSignal<EditorView>()
  const {configService} = useState()

  const langCompartment = new Compartment()

  createEffect(() => {
    let view = editorView()
    if (!view) {
      const theme = getTheme(configService.codeTheme.value)
      const lang = getLanguageConfig(p.lang)
      const doc = p.content

      view = new EditorView({
        parent: ref,
        doc,
        extensions: [
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          theme,
          langCompartment.of(lang.highlight()),
          clipPlugin(50),
        ],
      })

      setEditorView(view)
    } else {
      // Remove if content is shorter than doc. Happens when AI closes a code fence:
      // chunk: ``
      // chunk: `\n\n
      const content = p.content // p.item.openNode.content.trim()
      const docLen = view.state.doc.length
      const from = Math.min(content.length, docLen)

      // Reconfigure plugins because highlight infos comes after open fence:
      // chunk: ```
      // chunk: typescript\n
      const lang = getLanguageConfig(p.lang)

      view.dispatch({
        changes: {from, to: docLen, insert: content.slice(from)},
        annotations: Transaction.addToHistory.of(false),
        effects: [langCompartment.reconfigure(lang.highlight())],
      })

      setTimeout(() => {
        view?.scrollDOM.scrollTo({top: view.contentDOM.clientHeight})
      }, 10)
    }
  })

  return <div ref={ref} />
}

const Inline = (p: {item: TokenItem}) => {
  let ref!: HTMLElement

  createEffect(() => {
    const html = md.renderer.render([p.item.openNode], md.options, {})
    ref.innerHTML = html
  })

  return <span ref={ref} />
}

interface MeessageMarkdownProps {
  blocks?: PartialBlock[]
  content?: string
}

export const MessageMarkdown = (props: MeessageMarkdownProps) => {
  const blocks = (): PartialBlock[] =>
    props.content ? [{kind: 'text', content: props.content}] : (props.blocks ?? [])

  const createTokenItem = (node: Token, parentId: string, tokenIndex: number): TokenItem => ({
    id: tokenIndex.toString(),
    parentId,
    nodeType: node.type.replace('_open', ''),
    openNode: node,
  })

  const TextBlockNode = (props: {text: string}) => {
    const tree = createTreeStore<TokenItem>()

    const renderMessage = (content: string) => {
      try {
        const tokens = md.parse(content, {})

        batch(() => {
          tree.reset([])

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
      } catch {
        // ignore errors
      }
    }

    const chunkStart = createMutable({date: Date.now()})

    createSequentialEffect(
      () => props.text,
      async (text) => {
        const end = Date.now()
        const duration = end - chunkStart.date
        if (duration <= 40) await pause(40 - duration)
        renderMessage(text)
        chunkStart.date = Date.now()
      },
    )

    return <MarkdownTree tree={tree} childrenIds={tree.rootItemIds} />
  }

  const FileBlockNode = (props: {block: FileBlock}) => {
    return (
      <CodeBlock>
        <CodeBlockHeader block={props.block} />
        <CodeFence lang={props.block.lang} content={props.block.content?.trim() ?? ''} />
      </CodeBlock>
    )
  }

  return (
    <Index each={blocks()}>
      {(block) => (
        <Switch>
          <Match when={block().kind === 'text' ? block() : undefined}>
            {(b) => <TextBlockNode text={b().content ?? ''} />}
          </Match>
          <Match when={block().kind === 'file' ? block() : undefined}>
            {(b) => <FileBlockNode block={b() as FileBlock} />}
          </Match>
        </Switch>
      )}
    </Index>
  )
}
