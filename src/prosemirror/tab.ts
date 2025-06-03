import type {EditorState, Transaction} from 'prosemirror-state'
import type {EditorView} from 'prosemirror-view'
import type {Schema} from 'prosemirror-model'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {keymap} from 'prosemirror-keymap'

const onTab =
  (schema: Schema) =>
  (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean => {
    if (sinkListItem(schema.nodes.list_item)(state, dispatch)) {
      return true
    }

    if (view?.hasFocus()) {
      const tr = state.tr
      tr.insertText('\u0009')
      view.dispatch(tr)
      return true
    }

    return false
  }

export const createTabKeymap = (schema: Schema) =>
  keymap({
    Tab: onTab(schema),
    'Shift-Tab': liftListItem(schema.nodes.list_item),
  })
