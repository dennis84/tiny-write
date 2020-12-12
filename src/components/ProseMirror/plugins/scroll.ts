import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

const scroll = (view: EditorView) => {
  const dom = view.domAtPos(view.state.selection.$head.start())
  if (dom.node !== view.dom) {
    dom.node.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  }
}

export const scrollIntoView = () => new Plugin({
  props: {
    handleDOMEvents: {
      click: (view: EditorView) => {
        setTimeout(() => scroll(view), 200)
      },
      keyup: (view: EditorView) => {
        if (!view.state.selection.empty) return false
        scroll(view)
      }
    }
  },
})
