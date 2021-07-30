import {Node} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {Selection} from 'prosemirror-state'
import {keymap} from 'prosemirror-keymap'
import {inputRules, textblockTypeInputRule} from 'prosemirror-inputrules'
import {CodeBlockView} from './view'
import {Extension} from '@codemirror/state'

export const cleanLang = (lang: string) =>
  lang === 'js' ? 'javascript' :
  lang === 'ts' ? 'typescript' :
  lang === 'cplusplus' ? 'cpp' :
  lang === 'c++' ? 'cpp' :
  lang === 'yml' ? 'yaml' :
  lang === 'shell' ? 'bash' :
  lang

const codeBlockRule = (nodeType) =>
  textblockTypeInputRule(
    /^```([a-zA-Z]*)?\s$/,
    nodeType,
    match => {
      const lang = match[1]
      if (lang) return {params: {lang: cleanLang(lang)}}
      return {}
    }
  )

const arrowHandler = (dir) => (state, dispatch, view) => {
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
}

export interface CodeBlockProps {
  theme: string;
  typewriterMode: boolean;
  fontSize: number;
  extensions?: (view: EditorView, node: Node, getPos: () => number) => Extension[];
}

const codeBlockSchema = {
  content: 'text*',
  group: 'block',
  code: true,
  defining: true,
  draggable: true,
  isolating: true,
  marks: '',
  attrs: {params: {default: ''}},
  parseDOM: [{
    tag: 'pre',
    preserveWhitespace: 'full',
    getAttrs: node => ({params: node.getAttribute('data-params') || ''})
  }],
  toDOM: (node) => [
    'pre',
    node.attrs.params ? {'data-params': node.attrs.params} : {},
    ['code', 0]
  ]
}

export default (props: CodeBlockProps) => ({
  schema: (prev) => ({
    ...prev,
    nodes: prev.nodes.update('code_block', codeBlockSchema),
  }),
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [codeBlockRule(schema.nodes.code_block)]}),
    keymap(codeBlockKeymap),
  ],
  nodeViews: {
    code_block: (node, view, getPos, decos, innerDecos) => {
      return new CodeBlockView(node, view, getPos, decos, innerDecos, props)
    }
  },
})
