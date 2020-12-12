import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

const scroll = (view: EditorView) => {
  if (!view.state.selection.empty) return false
  const dom = view.domAtPos(view.state.selection.$head.start())
  const skip = dom.node.classList.contains('CodeMirror')
  if (!skip && dom.node !== view.dom) {
    scrollToElem(dom.node)
  }
}

const scrollToElem = (node: Element) => {
  node.scrollIntoView({
    block: 'center',
    behavior: 'smooth',
  })
}

export const scrollIntoView = () => new Plugin({
  props: {
    handleDOMEvents: {
      keyup: (view: EditorView) => {
        scroll(view)
      }
    }
  },
})
