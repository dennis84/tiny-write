import {InputRule} from 'prosemirror-inputrules'

export const markInputRule = (
  regexp: RegExp,
  name: string,
  getAttrs: any = undefined
) => new InputRule(regexp, (state, match, start, end) => {
  const attrs = getAttrs ? getAttrs(match) : getAttrs
  const tr = state.tr
  if (match[1]) {
    const startSpaces = match[0].search(/\S/)
    const textStart = start + match[0].indexOf(match[1])
    const textEnd = textStart + match[1].length
    let hasMarks = false
    state.doc.nodesBetween(textStart, textEnd, (node) => {
      if (node.marks.length > 0) {
        hasMarks = true
        return
      }
    })

    if (hasMarks) {
      return null
    }

    if (textEnd < end) tr.delete(textEnd, end)
    if (textStart > start) tr.delete(start + startSpaces, textStart)
    end = start + match[1].length
  }

  const markType = state.schema.marks[name]
  tr.addMark(start, end, markType.create(attrs))
  tr.removeStoredMark(markType)
  return tr
})

export const nodeInputRule = (
  regexp: RegExp,
  name: string,
  getAttrs: any = undefined
) => new InputRule(regexp, (state, match, start, end) => {
  const attrs = getAttrs ? getAttrs(match) : getAttrs
  const tr = state.tr
  const nodeType = state.schema.nodes[name]

  if (match[1]) {
    const offset = match[0].lastIndexOf(match[1])
    let matchStart = start + offset

    if (matchStart > end) {
      matchStart = end
    } else {
      end = matchStart + match[1].length
    }

    // insert last typed character
    const lastChar = match[0][match[0].length - 1]

    tr.insertText(lastChar, start + match[0].length - 1)

    // insert node from input rule
    tr.replaceWith(matchStart, end, nodeType.create(attrs))
    return tr
  } else if (match[0]) {
    tr.replaceWith(start, end, nodeType.create(attrs))
    return tr
  }

  return null
})
