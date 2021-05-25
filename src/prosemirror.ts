import {keymap} from 'prosemirror-keymap'
import {keymap as cmKeymap} from '@codemirror/view'
import {ySyncPlugin, yUndoPlugin} from 'y-prosemirror'
import base from './prosemirror/base'
import markdown from './prosemirror/markdown'
import link from './prosemirror/link'
import scroll from './prosemirror/scroll'
import todoList from './prosemirror/todo-list'
import code from './prosemirror/code'
import placeholder from './prosemirror/placeholder'
import codeBlock from './prosemirror/code-block'
import image from './prosemirror/image'
import dragHandle from './prosemirror/drag-handle'
import pasteMarkdown from './prosemirror/paste-markdown'
import {Config, YOptions} from '.'
import {codeTheme} from './config'

interface Props {
  data?: unknown;
  keymap?: any;
  config: Config;
  path?: string;
  y?: YOptions;
}

const yExtension = (props: Props) => ({
  plugins: (prev) => props.y ? [
    ...prev,
    ySyncPlugin(props.y.type),
    //yCursorPlugin(props.y.provider.awareness),
    yUndoPlugin(),
  ] : prev
})

const customKeymap = (props: Props) => ({
  plugins: (prev) => props.keymap ? [
    ...prev,
    keymap(props.keymap)
  ] : prev
})

const codeMirrorKeymap = (props: Props) => {
  const keys = []
  for (const key in props.keymap) {
    keys.push({key: key, run: props.keymap[key]})
  }

  return cmKeymap.of(keys)
}

export const createState = (props: Props) => ({
  editorState: props.data,
  extensions: [
    customKeymap(props),
    base,
    markdown,
    todoList,
    dragHandle,
    codeBlock({
      theme: codeTheme(props.config),
      typewriterMode: props.config.typewriterMode,
      fontSize: props.config.fontSize,
      extensions: () => [codeMirrorKeymap(props)],
    }),
    code,
    link,
    image(props.path),
    placeholder('Start typing ...'),
    scroll(props.config.typewriterMode),
    pasteMarkdown,
    yExtension(props),
  ]
})

export const createEmptyState = (props: Props) =>
  createState({
    ...props,
    data: createEmptyData(),
  })

export const createEmptyData = () => ({
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
