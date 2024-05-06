import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Ctrl} from '@/services'

const scroll = (view: EditorView) => {
  if (!view.state.selection.empty) return false
  const pos = view.state.selection.$head.start()
  const resolved = view.state.doc.resolve(pos)
  if (resolved.parent.type.spec.code) return false

  const dom = view.domAtPos(pos)
  if (dom.node !== view.dom) {
    scrollToElem(dom.node as Element)
  }
}

const scrollToElem = (node: Element) => {
  node.scrollIntoView({
    block: 'center',
    behavior: 'smooth',
  })
}

const scrollIntoView = (ctrl: Ctrl) => new Plugin({
  props: {
    handleDOMEvents: {
      keyup: (view: EditorView) => {
        if (ctrl.config.typewriterMode) scroll(view)
        return false
      }
    }
  },
})

export const plugins = (ctrl: Ctrl) => [
  scrollIntoView(ctrl)
]
