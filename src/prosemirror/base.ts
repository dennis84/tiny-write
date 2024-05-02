import {EditorState, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Schema} from 'prosemirror-model'
import {schema as markdownSchema} from 'prosemirror-markdown'
import {baseKeymap} from 'prosemirror-commands'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {dropCursor} from 'prosemirror-dropcursor'
import {buildKeymap} from 'prosemirror-example-setup'
import {keymap} from 'prosemirror-keymap'
import {ProseMirrorExtension} from '@/prosemirror'

const plainSchema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      draggable: true,
      toDOM: (node) => ['p', {class: node.content.size > 500 ? 'truncate' : undefined}, 0],
    },
    text: {
      group: 'inline'
    },
  }
})

const blockquoteSchema = {
  content: 'block+',
  group: 'block',
  toDOM: () => ['div', ['blockquote', 0]],
}

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
  schema: () => props.markdown ? ({
    nodes: plainSchema.spec.nodes,
    marks: plainSchema.spec.marks,
  }) : ({
    nodes: (markdownSchema.spec.nodes as any).update('blockquote', blockquoteSchema),
    marks: markdownSchema.spec.marks,
  }),
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
