import {Plugin} from 'prosemirror-state'
import type {EditorView} from 'prosemirror-view'
import type {ConfigService} from '@/services/ConfigService'

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

export const scrollIntoView = (configService: ConfigService) =>
  new Plugin({
    props: {
      handleDOMEvents: {
        keyup: (view: EditorView) => {
          if (configService.typewriterMode) scroll(view)
          return false
        },
      },
    },
  })
