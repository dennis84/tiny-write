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
            const start = pos + 1
            const end = pos + node.nodeSize

            const fullMatch = from <= start && to >= end
            const touched = (from >= start && from <= end) || (to >= start && to <= end)

            if (node.type.isAtom || node.type.name === 'code_block') {
              if (touched || fullMatch) {
                decos.push(Decoration.node(pos, pos + node.nodeSize, {class: 'selected'}))
              }
            } else {
              if (fullMatch) {
                decos.push(Decoration.node(pos, pos + node.nodeSize, {class: 'selected'}))
              }
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
