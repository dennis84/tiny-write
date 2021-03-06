import {inputRules, InputRule} from 'prosemirror-inputrules'
import {keymap} from 'prosemirror-keymap'

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

const markInputRule = (regexp, nodeType, getAttrs = undefined) =>
  new InputRule(regexp, (state, match, start, end) => {
    const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs
    const tr = state.tr
    if (match[1]) {
      const textStart = start + match[0].indexOf(match[1])
      const textEnd = textStart + match[1].length
      let hasMarks = false
      state.doc.nodesBetween(textStart, textEnd, (node) => {
        if (node.marks.length > 0) {
          hasMarks = true
          return false
        }
      })

      if (hasMarks) {
        return false
      }

      if (textEnd < end) tr.delete(textEnd, end)
      if (textStart > start) tr.delete(start, textStart)
      end = start + match[1].length
    }

    tr.addMark(start, end, nodeType.create(attrs))
    tr.removeStoredMark(nodeType)
    return tr
  })

export default {
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [codeRule(schema.marks.code)]}),
    keymap(codeKeymap),
  ]
}
