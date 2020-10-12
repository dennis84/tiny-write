import {EditorState} from 'prosemirror-state'
import {keymap} from 'prosemirror-keymap'
import {baseKeymap} from 'prosemirror-commands'
import {history} from 'prosemirror-history'
import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {buildKeymap} from 'prosemirror-example-setup'
import {arrowHandlers} from './code-block'
import {buildInputRules} from './input-rules'
import {schema} from './schema'
import {createLinkPlugin} from './link'
import {scrollIntoView} from './scroll'
import {dropImage} from './image'
import {placeholder} from './placeholder'
import {toggleFullScreen} from '../../remote'

export const createState = (data) =>
  data instanceof EditorState ? data :
  EditorState.fromJSON({
    schema,
    plugins: [
      buildInputRules(schema),
      keymap({
        'Cmd-Enter': () => {
          toggleFullScreen()
          return true
        }
      }),
      keymap(buildKeymap(schema)),
      keymap(baseKeymap),
      history(),
      dropCursor(),
      gapCursor(),
      createLinkPlugin(),
      scrollIntoView(),
      dropImage(),
      placeholder('Start typing ...'),
    ].concat(arrowHandlers)
  }, data)

export const createEmptyState = () => createState({
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
