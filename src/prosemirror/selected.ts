import {Plugin} from 'prosemirror-state'
import {Decoration, DecorationSet} from 'prosemirror-view'

export const selectedPlugin = new Plugin({
  props: {
    decorations(state) {
      const decos: Decoration[] = []
      try {
        if (!state.selection.empty) {
          const {from, to} = state.selection
          state.doc.forEach((node, pos) => {
            const end = pos + node.nodeSize
            const surrounded = from <= pos && to >= end
            if (surrounded) {
              decos.push(Decoration.node(pos, end, {class: 'ProseMirror-selectednode'}))
            }
          })
        }
      } catch (_e) {
        // ignore
      }

      return DecorationSet.create(state.doc, decos)
    },
  },
})
