import {EditorState} from 'prosemirror-state'
import {Schema} from 'prosemirror-model'
import {keymap} from 'prosemirror-keymap'
import {baseKeymap} from 'prosemirror-commands'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {history} from 'prosemirror-history'
import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {buildKeymap} from 'prosemirror-example-setup'
import {codeBlockOptions, arrowHandlers} from './components/ProseMirror/plugins/code-block'
import {buildInputRules} from './components/ProseMirror/plugins/input-rules'
import {createLinkPlugin} from './components/ProseMirror/plugins/link'
import {scrollIntoView} from './components/ProseMirror/plugins/scroll'
import {dropImage} from './components/ProseMirror/plugins/image'
import {placeholder} from './components/ProseMirror/plugins/placeholder'

interface Props {
  schema: Schema;
  data?: unknown;
  keymap?: any;
}

export const createState = (props: Props) =>
  EditorState.fromJSON({
    schema: props.schema,
    plugins: [
      buildInputRules(props.schema),
      keymap({
        ...(props.keymap ?? {}),
        'Tab': sinkListItem(props.schema.nodes.list_item),
        'Shift-Tab': liftListItem(props.schema.nodes.list_item),
      }),
      keymap(buildKeymap(props.schema)),
      keymap(baseKeymap),
      history(),
      dropCursor(),
      gapCursor(),
      createLinkPlugin(props.schema),
      scrollIntoView(),
      dropImage(props.schema),
      placeholder('Start typing ...'),
      arrowHandlers,
      codeBlockOptions(),
    ]
  }, props.data)

export const createEmptyState = (props: Props) =>
  createState({
    ...props,
    data: {
      doc: {
        type: 'doc',
        content: [{type: 'paragraph'}]
      },
      selection: {
        type: 'text',
        anchor: 1,
        head: 1
      }
    }
  })
