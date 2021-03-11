import {schema as markdownSchema} from 'prosemirror-markdown'
import {baseKeymap} from 'prosemirror-commands'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {history} from 'prosemirror-history'
import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {buildKeymap} from 'prosemirror-example-setup'
import {keymap} from 'prosemirror-keymap'

export default {
  schema: () => ({
    nodes: markdownSchema.spec.nodes,
    marks: markdownSchema.spec.marks,
  }),
  plugins: (prev, schema) => [
    ...prev,
    keymap({
      'Tab': sinkListItem(schema.nodes.list_item),
      'Shift-Tab': liftListItem(schema.nodes.list_item),
    }),
    keymap(buildKeymap(schema)),
    keymap(baseKeymap),
    history(),
    dropCursor({class: 'drop-cursor'}),
    gapCursor(),
  ]
}
