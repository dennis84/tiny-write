import {Plugin} from 'prosemirror-state'
import {Decoration, DecorationSet} from 'prosemirror-view'
import {ProseMirrorExtension} from '@/prosemirror'

const plugin = new Plugin({
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
              decos.push(Decoration.node(pos, end, {class: 'selected'}))
            }
          })
        }
      } catch (e) {
        // ignore
      }

      return DecorationSet.create(state.doc, decos)
    }
  },
})

export default (): ProseMirrorExtension => ({
  plugins: (prev) => [
    ...prev,
    plugin,
  ]
})
