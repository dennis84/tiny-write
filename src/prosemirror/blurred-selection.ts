import {Plugin, PluginKey} from 'prosemirror-state'
import {Decoration, DecorationSet, type EditorView} from 'prosemirror-view'

const blurredSelectionKey = new PluginKey<DecorationSet>('blurred-selection')

export function blurredSelectionPlugin() {
  return new Plugin<DecorationSet>({
    key: blurredSelectionKey,

    state: {
      init() {
        return DecorationSet.empty
      },

      apply(tr, old) {
        const meta = tr.getMeta(blurredSelectionKey) as Decoration[] | undefined

        if (meta !== undefined) {
          return meta.length ? DecorationSet.create(tr.doc, meta) : DecorationSet.empty
        }

        return old.map(tr.mapping, tr.doc)
      },
    },

    props: {
      decorations(state) {
        return blurredSelectionKey.getState(state)
      },

      handleDOMEvents: {
        blur(view: EditorView) {
          const {state} = view
          const {selection} = state

          if (selection.empty) {
            view.dispatch(state.tr.setMeta(blurredSelectionKey, []))
            return false
          }

          const decorations: Decoration[] = []

          for (const range of selection.ranges) {
            const from = range.$from.pos
            const to = range.$to.pos

            if (from === to) continue

            decorations.push(
              Decoration.inline(from, to, {
                class: 'blurred-selection',
              }),
            )
          }

          view.dispatch(state.tr.setMeta(blurredSelectionKey, decorations))

          return false
        },

        focus(view: EditorView) {
          const {state} = view
          const decorations = blurredSelectionKey.getState(state)

          if (decorations && decorations !== DecorationSet.empty) {
            view.dispatch(state.tr.setMeta(blurredSelectionKey, []))
          }

          return false
        },
      },
    },
  })
}
