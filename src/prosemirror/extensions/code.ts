import {inputRules} from 'prosemirror-inputrules'
import {DOMOutputSpec, Mark, MarkType, Schema} from 'prosemirror-model'
import {EditorState, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {keymap as createKeymap} from 'prosemirror-keymap'
import {markInputRule} from '@/prosemirror/extensions/rulebuilders'

const blank = '\xa0'

const onArrow = (dir: 'left' | 'right') => (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  editorView?: EditorView
): boolean => {
  if (!state.selection.empty || !dispatch || !editorView) return false
  const $pos = state.selection.$head
  const isCode = $pos.marks().find((m: Mark) => m.type.name === 'code')
  const tr = state.tr

  if (dir === 'left') {
    const up = editorView.endOfTextblock('up')
    if (!$pos.nodeBefore && up && isCode) {
      tr.insertText(blank, $pos.pos-1, $pos.pos)
      dispatch(tr)
    }
  } else {
    const down = editorView.endOfTextblock('down')
    if (!$pos.nodeAfter && down && isCode) {
      tr.insertText(blank, $pos.pos, $pos.pos+1)
      dispatch(tr)
    }
  }

  return false
}

const codeKeymap = {
  'ArrowLeft': onArrow('left'),
  'ArrowRight': onArrow('right'),
}

const codeRule = (nodeType: MarkType) =>
  markInputRule(/(?:`)([^`]+)(?:`)$/, nodeType)

export const keymap = createKeymap(codeKeymap)

export const plugin = (schema: Schema) => inputRules({rules: [codeRule(schema.marks.code)]})

export const schemaSpec = {
  marks: {
    code: {
      toDOM(): DOMOutputSpec {
        return ['code']
      },
    },
  }
}
