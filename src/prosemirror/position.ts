import {Plugin} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'

const position = new Plugin({
  props: {
    decorations(state) {
      const decos = []
      state.doc.descendants((node, pos) => {
        decos.push(Decoration.node(pos, pos + node.nodeSize, {
          'title': `${pos}-${pos+node.nodeSize}`,
        }))
      })

      return DecorationSet.create(state.doc, decos)
    }
  }
})

export default (enabled = false) => ({
  plugins: (prev) => enabled ? [
    ...prev,
    position,
  ] : prev
})
