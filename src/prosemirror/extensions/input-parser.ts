import {EditorState, Plugin, TextSelection, Transaction} from 'prosemirror-state'
import {Mark, Node, ResolvedPos} from 'prosemirror-model'
import {MarkdownParser} from 'prosemirror-markdown'

export const createInputParserPlugin = (parser: MarkdownParser) => new Plugin({
  appendTransaction: (transactions, oldState, newState) => {
    if (!newState.selection.empty) return

    const oldPos = oldState.selection.from
    const newPos = newState.selection.from
    if (oldPos === newPos) return

    const docChanges = transactions.some((tr) => tr.docChanged) && !oldState.doc.eq(newState.doc)

    const tr = toLink(parser, docChanges ? newState : oldState, newState)
    if (tr) return tr

    const linkMarkType = newState.schema.marks.link
    const linkMark = linkMarkType.isInSet(newState.selection.$from.marks())

    const editLinkMarkType = newState.schema.marks.edit_link
    const editLinkMark = editLinkMarkType.isInSet(newState.selection.$from.marks())

    // Transform to markdown
    if (linkMark) {
      const {href} = linkMark.attrs
      const textFrom = newState.selection.$from.pos - newState.selection.$from.textOffset
      const textTo = newState.selection.$from.after()
      const range = findMarkPosition(linkMark, newState.doc, textFrom, textTo)
      const text = newState.doc.textBetween(range.from, range.to, '\0', '\0')
      const node = newState.schema.text(`[${text}](${href})`)
        .mark([newState.schema.marks.edit_link.create({href})])

      const tr = newState.tr
      tr.replaceRangeWith(range.from, range.to, node)
      tr.setSelection(new TextSelection(tr.doc.resolve(newPos + 1)))
      return tr
    }

    // Update edit link mark attrs
    if (editLinkMark) {
      const textFrom = newState.selection.$from.pos - newState.selection.$from.textOffset
      const textTo = newState.selection.$from.after()
      const range = findMarkPosition(editLinkMark, newState.doc, textFrom, textTo)
      const text = newState.doc.textBetween(range.from, range.to, '\0', '\0')
      const node = parser.parse(text)?.content.firstChild
      const tr = newState.tr
      let href = editLinkMark.attrs.href
      node?.content.forEach((n) => {
        const linkMark = linkMarkType.isInSet(n.marks)
        if (linkMark) href = linkMark.attrs.href
      })
      tr.removeMark(range.from, range.to)
      tr.addMark(range.from, range.to, newState.schema.marks.edit_link.create({href}))
      return tr
    }
  }
})

const toLink = (
  parser: MarkdownParser,
  targetState: EditorState,
  newState: EditorState,
): Transaction | undefined => {
  const newPos = newState.selection.from
  const linkMarkType = newState.schema.marks.link

  // Get text under target state cursor
  const {from, to, text} = findWord(targetState, targetState.selection.$from)

  // Do nothing if text has code marks
  if (targetState.doc.rangeHasMark(from, to, newState.schema.marks.code)) {
    return
  }

  const node = parser.parse(text)?.content.firstChild
  if (!node) return
  let hasLink = false
  let editing = false
  let nextPos = newPos
  const diff = text.length - node.nodeSize + 2

  node.content.forEach((n, o) => {
    const linkMark = linkMarkType.isInSet(n.marks)
    if (linkMark) {
      hasLink = true
      const linkFrom = from + o
      const linkTo = linkFrom + n.nodeSize + diff
      if (newPos > linkFrom && newPos < linkTo) editing = true
      if (nextPos > linkFrom) nextPos -= diff
    } else if (n.type.name === 'image') {
      hasLink = true
      nextPos = from + o + n.nodeSize
    }
  })

  if (!hasLink || editing) {
    return
  }

  const tr = newState.tr
  tr.replaceWith(from, to, node.content)
  tr.setSelection(TextSelection.near(tr.doc.resolve(nextPos)))
  return tr
}

const findWord = (state: EditorState, pos: ResolvedPos) => {
  let from = pos.pos - (pos.nodeBefore?.nodeSize ?? 0)
  let to = pos.pos + (pos.nodeAfter?.nodeSize ?? 0)

  // Use current pos if between two nodes
  if (pos.textOffset === 0) {
    to = pos.pos
  }

  let text = state.doc.textBetween(from, to)

  // leading whitespace is dropped by md parser
  if (text.startsWith(' ')) {
    text = text.substring(1)
    from += 1
  }

  return {
    from,
    to,
    text,
  }
}

const findMarkPosition = (mark: Mark, doc: Node, from: number, to: number) => {
  let markPos = {from: -1, to: -1}
  doc.nodesBetween(from, to, (node, pos) => {
    if (markPos.from > -1) return false
    if (markPos.from === -1 && mark.isInSet(node.marks)) {
      markPos = {from: pos, to: pos + Math.max(node.textContent.length, 1)}
    }
  })

  return markPos
}
