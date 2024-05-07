import {DOMOutputSpec, NodeType, Schema} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {EditorState, Selection, Transaction, TextSelection} from 'prosemirror-state'
import {keymap as createKeymap} from 'prosemirror-keymap'
import {inputRules, textblockTypeInputRule} from 'prosemirror-inputrules'
import {Ctrl} from '@/services'
import {CodeBlockView} from './view'
import {ViewConfig} from '../..'

export const schemaSpec = {
  nodes: {
    code_block: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      selectable: true,
      // marks: 'ychange',
      attrs: {
        lang: {default: null},
        hidden: {default: false},
      },
      toDOM(): DOMOutputSpec {
        return ['pre', {}, ['code', 0]]
      }
    }
  }
}

type Direction = 'left' | 'right' | 'up' | 'down' | 'forward' | 'backward'

const codeBlockRule = (nodeType: NodeType) =>
  textblockTypeInputRule(
    /^```([a-z]*)?\s$/,
    nodeType,
    match => {
      const lang = match[1]
      if (lang) return {lang}
      return {}
    }
  )

const arrowHandler = (dir: Direction) => (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  view?: EditorView
) => {
  if (!view?.endOfTextblock(dir)) return false
  const side = dir == 'left' || dir == 'up' ? -1 : 1
  const $head = state.selection.$head
  const nextPos = Selection.near(
    state.doc.resolve(side > 0 ? $head.after() : $head.before()),
    side
  )

  if (nextPos.$head?.parent.type.name !== 'code_block') {
    return false
  }

  if (state.selection.empty) {
    dispatch?.(state.tr.setSelection(nextPos))
    return true
  }

  const to = state.doc.resolve(nextPos.$head.pos + nextPos.$head.parent.nodeSize * side)
  const sel = new TextSelection(state.selection.$anchor, to)
  dispatch?.(state.tr.setSelection(sel))
  return true
}

const codeBlockKeymap = {
  ArrowLeft: arrowHandler('left'),
  ArrowRight: arrowHandler('right'),
  ArrowUp: arrowHandler('up'),
  ArrowDown: arrowHandler('down'),
  'Shift-ArrowLeft': arrowHandler('left'),
  'Shift-ArrowRight': arrowHandler('right'),
  'Shift-ArrowUp': arrowHandler('up'),
  'Shift-ArrowDown': arrowHandler('down'),
}

export const keymap = createKeymap(codeBlockKeymap)

export const plugin = (schema: Schema) => inputRules({rules: [codeBlockRule(schema.nodes.code_block)]})

export const views = (ctrl: Ctrl): ViewConfig => ({
  nodeViews: {
    code_block: (node, view, getPos, _decos, innerDecos) =>
      new CodeBlockView(node, view, getPos, innerDecos, ctrl)
  }
})