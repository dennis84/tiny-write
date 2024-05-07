import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Fragment, Node, Schema, Slice} from 'prosemirror-model'
import {find as findLinks} from 'linkifyjs'
import {createMarkdownParser} from '@/markdown'

const isInlineContent = (f: Fragment) =>
  f.childCount === 1 && (
    f.firstChild?.type.name === 'paragraph' ||
    f.firstChild?.type.name === 'text'
  )

const transform = (view: EditorView, fragment: Fragment) => {
  const nodes: Node[] = []
  const selection = view.state.selection
  const linkMarkType = view.state.schema.marks.link
  const editLinkMarkType = view.state.schema.marks.edit_link
  const editLinkMark = editLinkMarkType.isInSet(selection.$from.marks())

  fragment.forEach((child: Node) => {
    if (child.isText && child.text) {
      if (editLinkMark) {
        const node = child.mark(editLinkMark.addToSet(child.marks))
        nodes.push(node)
        return
      }

      const links = findLinks(child.text)
      if (links.length > 0) {
        for (let i = 0; i < links.length; i++) {
          const cur = links[i]
          const prev = links[i-1]
          const next = links[i+1]

          if (!prev && cur.start > 0) {
            nodes.push(child.cut(0, cur.start))
          }

          if (prev && prev.end < cur.start) {
            nodes.push(child.cut(prev.end, cur.start))
          }

          const node = child
            .cut(cur.start, cur.end)
            .mark(linkMarkType.create({href: cur.href}).addToSet(child.marks))
          nodes.push(node)

          if (!next && cur.end < child.text.length) {
            nodes.push(child.cut(links[links.length-1].end))
          }
        }

        return
      }

      nodes.push(child)
    } else {
      nodes.push(child.copy(transform(view, child.content)))
    }
  })

  return Fragment.fromArray(nodes)
}

let shiftKey = false

export const plugin = (schema: Schema) => {
  const parser = createMarkdownParser(schema)
  return new Plugin({
    props: {
      handleDOMEvents: {
        keydown: (_, event: KeyboardEvent) => {
          shiftKey = event.shiftKey
          return false
        },
        keyup: () => {
          shiftKey = false
          return false
        }
      },
      handlePaste: (view, event) => {
        if (!event.clipboardData) return false
        const text = event.clipboardData.getData('text/plain')
        const html = event.clipboardData.getData('text/html')

        // otherwise, if we have html then fallback to the default HTML
        // parser behavior that comes with Prosemirror.
        if (text.length === 0 || html) return false
        event.preventDefault()
        const paste = parser.parse(text)
        if (!paste) return false
        const slice = paste.slice(0)
        let fragment = shiftKey ? slice.content : transform(view, slice.content)
        const selection = view.state.selection

        if (isInlineContent(fragment)) {
          fragment = fragment.child(0).content
        }

        if (
          isInlineContent(fragment) &&
          fragment.firstChild?.marks.find((m) => m.type.name === 'link') &&
          selection.from !== selection.to
        ) {
          const mark = schema.marks.link.create({href: text})
          const tr = view.state.tr.addMark(selection.from, selection.to, mark)
          view.dispatch(tr)
          return true
        }

        const tr = view.state.tr.replaceSelection(new Slice(
          fragment,
          slice.openStart,
          slice.openEnd
        ))

        view.dispatch(tr)
        return true
      }
    }
  })
}
