import {Selection, Plugin, PluginKey} from 'prosemirror-state'
import {EditorView, Decoration, DecorationSet} from 'prosemirror-view'
import {keymap} from 'prosemirror-keymap'
import {inputRules, textblockTypeInputRule} from 'prosemirror-inputrules'
import {CodeBlockView} from './view'

const cleanLang = (lang: string) =>
  lang === 'js' ? 'javascript' :
  lang === 'ts' ? 'typescript' :
  lang === 'cplusplus' ? 'cpp' :
  lang === 'c++' ? 'cpp' :
  lang

const codeBlockRule = (nodeType) =>
  textblockTypeInputRule(
    /^```([a-zA-Z]*)?\s$/,
    nodeType,
    match => {
      const lang = match[1]
      if (lang) return {params: cleanLang(lang)}
      return {}
    }
  )

function arrowHandler(dir) {
  return (state, dispatch, view) => {
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
  extraKeys?: {[key: string]: unknown};
}

const codeBlockPlugin = (props: CodeBlockProps) => new Plugin({
  key: new PluginKey('code-block'),
  state: {
    init: () => ({...defaultProps, ...props}),
    apply(tr, prev) {
      const meta = tr.getMeta('code-block')
      return meta ? meta : prev
    }
  },
  props: {
    decorations(state) {
      const decos = []
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'code_block') {
          decos.push(Decoration.node(pos, pos + node.nodeSize, this.getState(state)))
        }
      })

      return DecorationSet.create(state.doc, decos)
    }
  }
})

export const updateOptions = (view: EditorView, options: CodeBlockProps) => {
  const tr = view.state.tr
  tr.setMeta('code-block', options)
  view.dispatch(tr)
}

export default (props: CodeBlockProps) => ({
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [codeBlockRule(schema.nodes.code_block)]}),
    keymap(codeBlockKeymap),
    codeBlockPlugin({...defaultProps, ...props}),
  ],
  nodeViews: {
    code_block: (node, view, getPos, decos) => {
      return new CodeBlockView(node, view, getPos, view.state.schema, decos)
    }
  },
})
