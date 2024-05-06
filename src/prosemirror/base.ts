import {EditorState, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Schema} from 'prosemirror-model'
import {baseKeymap} from 'prosemirror-commands'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {dropCursor} from 'prosemirror-dropcursor'
import {buildKeymap} from 'prosemirror-example-setup'
import {keymap} from 'prosemirror-keymap'
import {ProseMirrorExtension} from '@/prosemirror'

interface Props {
  markdown: boolean;
  dropcursor?: boolean;
}

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

export default (props: Props): ProseMirrorExtension => ({
  plugins: (prev, schema) => [
    ...prev,
    keymap({
      'Tab': onTab(schema),
      'Shift-Tab': liftListItem(schema.nodes.list_item),
    }),
    keymap(buildKeymap(schema)),
    keymap(baseKeymap),
    ...(props.dropcursor !== false ? [dropCursor({class: 'drop-cursor'})] : []),
  ]
})
