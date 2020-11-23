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
import {toggleFullScreen} from './remote'
import {mod} from './env'
import {Dispatch, New} from './reducer'

export const createState = (dispatch: Dispatch, schema: Schema, data: unknown) =>
  EditorState.fromJSON({
    schema,
    plugins: [
      buildInputRules(schema),
      keymap({
        [`${mod}-n`]: () => {
          dispatch(New)
          return true
        },
        'Cmd-Enter': () => {
          toggleFullScreen()
          return true
        },
        'Alt-Enter': () => {
          toggleFullScreen()
          return true
        },
        'Tab': sinkListItem(schema.nodes.list_item),
        'Shift-Tab': liftListItem(schema.nodes.list_item),
      }),
      keymap(buildKeymap(schema)),
      keymap(baseKeymap),
      history(),
      dropCursor(),
      gapCursor(),
      createLinkPlugin(schema),
      scrollIntoView(),
      dropImage(schema),
      placeholder('Start typing ...'),
      arrowHandlers,
      codeBlockOptions(),
    ]
  }, data)

export const createEmptyState = (dispatch: Dispatch, schema: Schema) =>
  createState(dispatch, schema, {
    doc: {
      type: 'doc',
      content: [{type: 'paragraph'}]
    },
    selection: {
      type: 'text',
      anchor: 1,
      head: 1
    }
  })
