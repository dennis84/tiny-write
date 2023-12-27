import {EditorState, Plugin, TextSelection, Transaction} from 'prosemirror-state'
import {Mark, Node, ResolvedPos} from 'prosemirror-model'
import {MarkdownParser} from 'prosemirror-markdown'
import {createMarkdownParser} from '@/markdown'
import {ProseMirrorExtension} from '.'

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    marks: (prev.marks as any).append(editLinkSchema),
  }),
  plugins: (prev, schema) => [
    plugin(createMarkdownParser(schema)),
    ...prev
  ],
})

const editLinkSchema = {
  edit_link: {
    toDOM: () => ['span', {class: 'edit-link'}],
  },
}

const plugin = (parser: MarkdownParser) => new Plugin({
  appendTransaction: (transactions, oldState, newState) => {
    if (!newState.selection.empty) return

    const oldPos = oldState.selection.from
    const newPos = newState.selection.from
    if (oldPos === newPos) return

    const docChanges = transactions.some((tr) => tr.docChanged) && !oldState.doc.eq(newState.doc)

    const tr = toLink(parser, docChanges ? newState : oldState, newState)
    if (tr) return tr

    const linkMark = newState.schema.marks.link
    const mark = linkMark.isInSet(newState.selection.$from.marks())

    // Transform to markdown
    if (mark) {
      const {href} = mark.attrs
      const textFrom = newState.selection.$from.pos - newState.selection.$from.textOffset
      const textTo = newState.selection.$from.after()
      const range = findMarkPosition(mark, newState.doc, textFrom, textTo)
      const text = newState.doc.textBetween(range.from, range.to, '\0', '\0')
      const node = newState.schema.text(`[${text}](${href})`)
        .mark([newState.schema.marks.edit_link.create()])

      const tr = newState.tr
      tr.replaceRangeWith(range.from, range.to, node)
      tr.setSelection(new TextSelection(tr.doc.resolve(newPos + 1)))
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
  const linkMark = newState.schema.marks.link

  // Get text under target state cursor
  const {from, to, text} = findWord(targetState, targetState.selection.$from)

  // Do nothing if text has code marks
  if (targetState.doc.rangeHasMark(from, to, newState.schema.marks.code)) {
    return
  }

  const node = parser.parse(text)?.content.firstChild
  if (!node) return
  let hasLink = false
  let linkFrom = from
  let linkTo = to

  node.content.forEach((n, o) => {
    const m = linkMark.isInSet(n.marks)
    if (!hasLink && m) {
      hasLink = true
      linkFrom = from + o
      linkTo = linkFrom + n.nodeSize + 4 + m.attrs.href.length
    }
  })

  if (!hasLink || (newPos > linkFrom && newPos < linkTo)) {
    return
  }

  const tr = newState.tr
  tr.replaceWith(from, to, node.content)
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
