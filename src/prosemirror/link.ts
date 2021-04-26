import {Plugin, PluginKey, TextSelection} from 'prosemirror-state'

const REGEX = /(^|\s)\[(.+)\]\(([^ ]+)(?: "(.+)")?\)/

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

const markdownLinks = (schema) => {
  const plugin = new Plugin({
    key: new PluginKey('markdown-links'),
    state: {
      init() {
        return {}
      },
      apply(tr, state) {
        const action = tr.getMeta(this)
        if (action?.pos) {
          state.pos = action.pos
        }

        return state
      }
    },
    props: {
      handleDOMEvents: {
        keyup: (view) => {
          return handleMove(view)
        },
        click: (view, e) => {
          if (handleMove(view)) {
            e.preventDefault()
          }

          return true
        },
      }
    }
  })

  const resolvePos = (view, pos) => {
    try {
      return view.state.doc.resolve(pos)
    } catch (err) {
      // ignore
    }
  }

  const toLink = (view, tr) => {
    const sel = view.state.selection
    const lastPos = plugin.getState(view.state).pos

    if (lastPos !== undefined) {
      const $from = resolvePos(view, lastPos)
      if (!$from || $from.depth === 0 || $from.parent.type.spec.code) {
        return false
      }

      const lineFrom = $from.before()
      const lineTo = $from.after()

      const line = view.state.doc.textBetween(lineFrom, lineTo, '\0', '\0')
      const match = REGEX.exec(line)

      if (match) {
        const [full,, text, href] = match
        const spaceLeft = full.indexOf(text) - 1
        const spaceRight = full.length - text.length - href.length - spaceLeft - 4
        const start = match.index + $from.start() + spaceLeft
        const end = start + full.length - spaceLeft - spaceRight

        if (sel.$from.pos >= start && sel.$from.pos <= end) {
          return false
        }

        // Do not convert md links if content has marks
        const $startPos = resolvePos(view, start)
        if ($startPos.marks().length > 0) {
          return false
        }

        const textStart = start + 1
        const textEnd = textStart + text.length

        if (textEnd < end) tr.delete(textEnd, end)
        if (textStart > start) tr.delete(start, textStart)

        const to = start + text.length
        tr.addMark(start, to, schema.marks.link.create({href}))

        const sub = end - textEnd + textStart - start
        tr.setMeta(plugin, {pos: sel.$cursor.pos - sub})

        return true
      }
    }

    return false
  }

  const toMarkdown = (view, tr) => {
    const sel = view.state.selection
    const $from = resolvePos(view, sel.$cursor.pos)
    if (!$from || $from.depth === 0 || $from.parent.type.spec.code) {
      return false
    }

    const textFrom = $from.before()
    const textTo = $from.after()
    const mark = schema.marks.link.isInSet(sel.$from.marks())

    if (mark) {
      const {href} = mark.attrs
      const range = findMarkPosition(mark, view.state.doc, textFrom, textTo)
      const text = view.state.doc.textBetween(range.from, range.to, '\0', '\0')
      tr.replaceRangeWith(range.from, range.to, view.state.schema.text(`[${text}](${href})`))
      tr.setSelection(new TextSelection(tr.doc.resolve(sel.$head.pos + 1)))
      tr.setMeta(plugin, {pos: sel.$cursor.pos})
      return true
    }

    return false
  }

  const handleMove = (view) => {
    const sel = view.state.selection
    if (!sel.empty || !sel.$cursor) return false
    const pos = sel.$cursor.pos
    const tr = view.state.tr

    if (toLink(view, tr)) {
      view.dispatch(tr)
      return true
    }

    if (toMarkdown(view, tr)) {
      view.dispatch(tr)
      return true
    }

    tr.setMeta(plugin, {pos})
    view.dispatch(tr)
    return false
  }

  return plugin
}

export default {
  plugins: (prev, schema) => [
    ...prev,
    markdownLinks(schema),
  ]
}
