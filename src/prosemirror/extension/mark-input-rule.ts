import {InputRule} from 'prosemirror-inputrules'

export const markInputRule = (regexp, nodeType, getAttrs = undefined) =>
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
