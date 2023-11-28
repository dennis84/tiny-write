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
          state.doc.nodesBetween(from ,to, (node, pos) => {
            decos.push(Decoration.node(pos, pos + node.nodeSize, {class: 'selected'}))
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
