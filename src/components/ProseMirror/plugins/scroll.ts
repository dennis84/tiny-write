import {Plugin} from 'prosemirror-state'

export const scrollIntoView = () => new Plugin({
  props: {
    handleDOMEvents: {
      keyup: (view) => {
        if (!view.state.selection.empty) return false
        const dom = view.domAtPos(view.state.selection.$head.start())
        dom.node.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        })
      }
    }
  }
})
