import {keymap} from 'prosemirror-keymap'

export const onEnterDoubleNewline = (fn: () => void) =>
  keymap({
    Enter: (state) => {
      const {selection, doc} = state
      if (!selection.empty) return false

      const idx = selection.$from.index(0)
      if (idx <= 0) return false // need a previous top-level sibling

      const current = doc.child(idx)
      const prev = doc.child(idx - 1)

      const currentEmpty = current.type.isTextblock && current.content.size === 0
      const prevEmpty = prev.type.isTextblock && prev.content.size === 0

      if (currentEmpty && prevEmpty) {
        fn()
        return true // prevent default Enter
      }

      return false
    },
  })
