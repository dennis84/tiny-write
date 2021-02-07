import {Plugin} from 'prosemirror-state'

const REGEX = /\[([^[\]]+?)\]\((.+?)\)/

const findMarkPosition = (mark, doc, from, to) => {
  let markPos = {from: -1, to: -1}
  doc.nodesBetween(from, to, (node, pos) => {
    if (markPos.from > -1) return false
    if (markPos.from === -1 && mark.isInSet(node.marks)) {
      markPos = {from: pos, to: pos + Math.max(node.textContent.length, 1)}
    }
  })

  return markPos
}

const markdownLinks = (schema) => new Plugin({
  props: {
    handleDOMEvents: {
      keyup: (view) => {
        const sel = view.state.selection
        if (!sel.empty) return false

        const $position = sel.$from
        const textFrom = $position.start()
        const textTo = $position.end()
        const mark = schema.marks.link.isInSet($position.marks())

        if (mark) {
          const range = findMarkPosition(mark, view.state.doc, textFrom, textTo)
          const {title, href} = mark.attrs
          const tr = view.state.tr
          tr.replaceRangeWith(range.from, range.to, view.state.schema.text(`[${title}](${href})`))
          view.dispatch(tr)
        }

        return false
      },
      keydown: (view, event) => {
        const sel = view.state.selection
        const $position = sel.$from
        if (!sel.empty) return false

        const nextPos =
          event.key === 'ArrowLeft' ? $position.pos - 1 :
          event.key === 'ArrowRight' ? $position.pos + 1 :
          event.key === 'ArrowUp' ? undefined :
          event.key === 'ArrowDown' ? undefined :
          $position.pos + 1

        const textFrom = $position.start()
        const textTo = $position.end()

        const text = $position.doc.textBetween(textFrom, textTo, '\0', '\0')
        const match = REGEX.exec(text)

        if (match) {
          const start = match.index + $position.start()
          const end = start + match[0].length
          if (nextPos && nextPos >= start && nextPos <= end) return

          const tr = view.state.tr
          const textStart = start + match[0].indexOf(match[1])
          const textEnd = textStart + match[1].length
          if (textEnd < end) tr.delete(textEnd, end)
          if (textStart > start) tr.delete(start, textStart)
          const to = start + match[1].length

          tr.addMark(start, to, schema.marks.link.create({
            title: match[1],
            href: match[2]
          }))

          view.dispatch(tr)
        }

        return false
      }
    }
  }
})

export default {
  plugins: (prev, schema) => [
    ...prev,
    markdownLinks(schema),
  ]
}
