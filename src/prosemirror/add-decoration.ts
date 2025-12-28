import {Plugin, PluginKey} from 'prosemirror-state'
import {DecorationSet} from 'prosemirror-view'

export const addDecorationKey = new PluginKey('assistant-progress')

export const addDecorationPlugin = new Plugin({
  key: addDecorationKey,
  state: {
    init(_config, instance) {
      return DecorationSet.create(instance.doc, [])
    },
    apply(tr, set) {
      // Map existing decorations forward through the transaction
      set = set.map(tr.mapping, tr.doc)

      // Check for meta instructions to add/remove decorations
      const meta = tr.getMeta(addDecorationKey)
      if (meta?.add) {
        set = set.add(tr.doc, meta.add)
      }
      if (meta?.remove) {
        set = set.remove(meta.remove)
      }

      return set
    },
  },
  props: {
    decorations(state) {
      return addDecorationKey.getState(state)
    },
  },
})
