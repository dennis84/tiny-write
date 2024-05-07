import {EditorState, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Schema} from 'prosemirror-model'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {keymap as createKeymap} from 'prosemirror-keymap'

const onTab = (schema: Schema) => (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  view?: EditorView
): boolean => {
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

export const keymap = (schema: Schema) => createKeymap({
  'Tab': onTab(schema),
  'Shift-Tab': liftListItem(schema.nodes.list_item),
})
