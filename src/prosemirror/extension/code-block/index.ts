import {Node, NodeType} from 'prosemirror-model'
import {Decoration, EditorView} from 'prosemirror-view'
import {EditorState, Selection, Transaction} from 'prosemirror-state'
import {keymap} from 'prosemirror-keymap'
import {inputRules, textblockTypeInputRule} from 'prosemirror-inputrules'
import {Extension} from '@codemirror/state'
import {CodeBlockView} from './view'
import {ProseMirrorExtension} from '../../state'
import {PrettierConfig} from '../../..'

type Direction = 'left' | 'right' | 'up' | 'down' | 'forward' | 'backward'

export const cleanLang = (lang: string) =>
  lang === 'js' ? 'javascript' :
  lang === 'ts' ? 'typescript' :
  lang === 'cplusplus' ? 'cpp' :
  lang === 'c++' ? 'cpp' :
  lang === 'yml' ? 'yaml' :
  lang === 'shell' ? 'bash' :
  lang === 'tf' ? 'hcl' :
  lang

const codeBlockRule = (nodeType: NodeType) =>
  textblockTypeInputRule(
    /^```([a-zA-Z]*)?\s$/,
    nodeType,
    match => {
      const lang = match[1]
      if (lang) return {params: {lang: cleanLang(lang)}}
      return {}
    }
  )

const arrowHandler = (dir: Direction) => (
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  view: EditorView
) => {
  if (state.selection.empty && view.endOfTextblock(dir)) {
    const side = dir == 'left' || dir == 'up' ? -1 : 1
    const $head = state.selection.$head
    const nextPos = Selection.near(
      state.doc.resolve(side > 0 ? $head.after() : $head.before()),
      side
    )

    if (nextPos.$head?.parent.type.name == 'code_block') {
      dispatch(state.tr.setSelection(nextPos))
      return true
    }
  }
  return false
}

const codeBlockKeymap = {
  ArrowLeft: arrowHandler('left'),
  ArrowRight: arrowHandler('right'),
  ArrowUp: arrowHandler('up'),
  ArrowDown: arrowHandler('down'),
}

export const defaultProps = {
  theme: 'material-light',
  typewriterMode: false,
  fontSize: 18,
  prettier: {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    semi: false,
    singleQuote: true,
  }
}

export interface CodeBlockProps {
  theme: string;
  typewriterMode: boolean;
  fontSize: number;
  prettier: PrettierConfig;
  extensions?: (view: EditorView, node: Node, getPos: () => number) => Extension[];
}

const codeBlockSchema = {
  content: 'text*',
  group: 'block',
  code: true,
  defining: true,
  isolating: true,
  marks: '',
  attrs: {params: {default: ''}},
  parseDOM: [{
    tag: 'pre',
    preserveWhitespace: 'full',
    getAttrs: (node: Element) => ({params: node.getAttribute('data-params') || ''})
  }],
  toDOM: (node: Node) => [
    'pre',
    node.attrs.params ? {'data-params': node.attrs.params} : {},
    ['code', 0]
  ]
}

export default (props: CodeBlockProps): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any).update('code_block', codeBlockSchema),
  }),
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [codeBlockRule(schema.nodes.code_block)]}),
    keymap(codeBlockKeymap),
  ],
  nodeViews: {
    // @ts-ignore
    code_block: (
      node: Node,
      view: EditorView,
      getPos: () => number,
      _decos: Decoration[],
      innerDecos: any
    ) => new CodeBlockView(node, view, getPos, innerDecos, props)
  },
})
