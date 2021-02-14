import {Plugin, PluginKey, TextSelection} from 'prosemirror-state'

const REGEX = /(^|\s)\[([^[\]]+?)\]\((.+?)\)/

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
      if (!$from || $from.depth === 0) {
        return false
      }

      const textFrom = $from.before()
      const textTo = $from.after()

      const text = view.state.doc.textBetween(textFrom, textTo, '\0', '\0')
      const match = REGEX.exec(text)

      if (match) {
        const [full,, title, href] = match
        const start = match.index + $from.start()
        const end = start + full.length
        if (sel.$from.pos >= start && sel.$from.pos <= end) {
          return false
        }

        const textStart = start + full.indexOf(title)
        const textEnd = textStart + title.length
        if (textEnd < end) tr.delete(textEnd, end)
        if (textStart > start) tr.delete(start, textStart)

        const to = start + title.length
        tr.addMark(start, to, schema.marks.link.create({title, href}))

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

    const textFrom = $from.before()
    const textTo = $from.after()
    const mark = schema.marks.link.isInSet(sel.$from.marks())

    if (mark) {
      const range = findMarkPosition(mark, view.state.doc, textFrom, textTo)
      const {title, href} = mark.attrs
      tr.replaceRangeWith(range.from, range.to, view.state.schema.text(`[${title}](${href})`))
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
