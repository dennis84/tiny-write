import {Plugin} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'
import {ProseMirrorExtension} from '@/prosemirror'

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

export default (enabled = false): ProseMirrorExtension => ({
  plugins: (prev) => enabled ? [
    ...prev,
    position,
  ] : prev
})
