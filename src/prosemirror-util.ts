import {keymap} from 'prosemirror-keymap'
import base from './prosemirror/base'
import markdown from './prosemirror/markdown'
import link from './prosemirror/link'
import scroll from './prosemirror/scroll'
import todoList from './prosemirror/todo-list'
import code from './prosemirror/code'
import dropImage from './prosemirror/image'
import placeholder from './prosemirror/placeholder'
import codeBlock from './prosemirror/code-block'
import {Config} from '.'
import {codeTheme} from './config'

interface Props {
  data?: unknown;
  keymap?: any;
  config: Config;
}

const customKeymap = (props: Props) => ({
  plugins: (prev) => props.keymap ? [
    ...prev,
    keymap(props.keymap)
  ] : prev
})

export const createState = (props: Props) => ({
  editorState: props.data,
  extensions: [
    base,
    customKeymap(props),
    markdown,
    todoList,
    codeBlock({
      theme: codeTheme(props.config),
      typewriterMode: props.config.typewriterMode,
      fontSize: props.config.fontSize,
    }),
    code,
    link,
    dropImage,
    placeholder('Start typing ...'),
    scroll(props.config.typewriterMode),
  ]
})

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
