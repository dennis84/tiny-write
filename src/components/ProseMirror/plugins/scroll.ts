import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

export const scrollIntoView = () => new Plugin({
  view: (view: EditorView) => ({
    update: () => {
      if (!view.state.selection.empty) return false
      const dom = view.domAtPos(view.state.selection.$head.start())
      if (dom.node !== view.dom) {
        dom.node.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        })
      }
    }
  })
})
