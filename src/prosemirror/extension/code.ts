import {inputRules} from 'prosemirror-inputrules'
import {keymap} from 'prosemirror-keymap'
import {markInputRule} from './mark-input-rule'

const blank = '\xa0'

const onArrow = (dir) => (state, dispatch, editorView) => {
  if (!state.selection.empty) return false
  const $pos = state.selection.$head
  const isCode = $pos.marks().find(m => m.type.name === 'code')
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
}

const codeKeymap = {
  'ArrowLeft': onArrow('left'),
  'ArrowRight': onArrow('right'),
}

const codeRule = (nodeType) =>
  markInputRule(/(?:`)([^`]+)(?:`)$/, nodeType)

export default {
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [
      codeRule(schema.marks.code),
    ]}),
    keymap(codeKeymap),
  ]
}
