import {EditorState} from 'prosemirror-state'
import {Schema} from 'prosemirror-model'
import {schema as markdownSchema} from 'prosemirror-markdown'
import {keymap} from 'prosemirror-keymap'
import {baseKeymap} from 'prosemirror-commands'
import {inputRules} from 'prosemirror-inputrules'
import {sinkListItem, liftListItem} from 'prosemirror-schema-list'
import {history} from 'prosemirror-history'
import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {buildKeymap} from 'prosemirror-example-setup'
import {codeBlockRule, codeBlockOptions, codeBlockKeymap} from './components/ProseMirror/plugins/code-block'
import {markdownRules} from './components/ProseMirror/plugins/markdown-shortcuts'
import {markdownLinks} from './components/ProseMirror/plugins/link'
import {scrollIntoView} from './components/ProseMirror/plugins/scroll'
import {dropImage} from './components/ProseMirror/plugins/image'
import {placeholder} from './components/ProseMirror/plugins/placeholder'
import {codeKeymap, codeRule} from './components/ProseMirror/plugins/code'
import {todoListRule, todoListSchema, todoListKeymap} from './components/ProseMirror/plugins/todo-list'
import {Config} from '.'
import {codeTheme} from './config'

interface Props {
  data?: unknown;
  keymap?: any;
  config: Config;
}

export const schema = new Schema({
  nodes: markdownSchema.spec.nodes.append(todoListSchema),
  marks: markdownSchema.spec.marks,
})

export const reconfigureState = (state: EditorState, props: Props) =>
  state.reconfigure({
    schema: state.schema,
    plugins: createPlugins(props),
  })

export const createState = (props: Props) =>
  EditorState.fromJSON({
    schema,
    plugins: createPlugins(props),
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

const createPlugins = (props: Props) => [
  inputRules({rules: [
    ...markdownRules(schema),
    codeRule(schema.marks.code),
    codeBlockRule(schema.nodes.code_block),
    todoListRule(schema.nodes.todo_list),
  ]}),
  keymap(todoListKeymap(schema)),
  keymap({
    ...(props.keymap ?? {}),
    'Tab': sinkListItem(schema.nodes.list_item),
    'Shift-Tab': liftListItem(schema.nodes.list_item),
  }),
  keymap(buildKeymap(schema)),
  keymap(baseKeymap),
  keymap(codeKeymap),
  keymap(codeBlockKeymap),
  history(),
  dropCursor(),
  gapCursor(),
  markdownLinks(schema),
  dropImage(schema),
  placeholder('Start typing ...'),
  codeBlockOptions({
    theme: codeTheme(props.config),
    typewriterMode: props.config.typewriterMode,
  }),
  ...(props.config.typewriterMode ? [scrollIntoView()] : []),
]
