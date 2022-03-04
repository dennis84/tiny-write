import {keymap} from 'prosemirror-keymap'
import {keymap as cmKeymap} from '@codemirror/view'
import {ySyncPlugin, yCursorPlugin, yUndoPlugin} from 'y-prosemirror'
import {ProseMirrorState} from './prosemirror/state'
import {Schema} from 'prosemirror-model'
import base from './prosemirror/extension/base'
import markdown from './prosemirror/extension/markdown'
import link from './prosemirror/extension/link'
import scroll from './prosemirror/extension/scroll'
import todoList from './prosemirror/extension/todo-list'
import code from './prosemirror/extension/code'
import strikethrough from './prosemirror/extension/strikethrough'
import placeholder from './prosemirror/extension/placeholder'
import codeBlock from './prosemirror/extension/code-block'
import image from './prosemirror/extension/image'
import dragHandle from './prosemirror/extension/drag-handle'
import pasteMarkdown from './prosemirror/extension/paste-markdown'
import table from './prosemirror/extension/table'
import {ProseMirrorExtension} from './prosemirror/state'
import {Config, YOptions} from '.'
import {codeTheme} from './config'

interface Props {
  data?: unknown;
  keymap?: any;
  config: Config;
  markdown: boolean;
  path?: string;
  y?: YOptions;
}

export const cursorBuilder = (user: any): HTMLElement => {
  const cursor = document.createElement('span')
  cursor.classList.add('ProseMirror-yjs-cursor')
  cursor.setAttribute('style', `border-color: ${user.background}`)
  const userDiv = document.createElement('span')
  userDiv.setAttribute('style', `background-color: ${user.background}; color: ${user.foreground}`)
  userDiv.textContent = user.name
  cursor.append(userDiv)
  return cursor
}

const yExtension = (props: Props): ProseMirrorExtension => ({
  plugins: (prev) => props.y ? [
    ...prev,
    ySyncPlugin(props.y.type),
    // @ts-ignore
    yCursorPlugin(props.y.provider.awareness, {cursorBuilder}),
    yUndoPlugin(),
  ] : prev
})

const customKeymap = (props: Props): ProseMirrorExtension => ({
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

export const createState = (props: Props): ProseMirrorState => ({
  editorState: props.data,
  extensions: props.markdown ? [
    placeholder('Start typing ...'),
    customKeymap(props),
    base(props.markdown),
    scroll(props.config.typewriterMode),
    yExtension(props),
    dragHandle(),
  ] : [
    customKeymap(props),
    base(props.markdown),
    markdown(),
    todoList(),
    dragHandle(),
    codeBlock({
      theme: codeTheme(props.config),
      typewriterMode: props.config.typewriterMode,
      fontSize: props.config.fontSize,
      prettier: props.config.prettier,
      extensions: () => [codeMirrorKeymap(props)],
    }),
    code(),
    strikethrough(),
    link(),
    table(),
    image(props.path),
    placeholder('Start typing ...'),
    scroll(props.config.typewriterMode),
    pasteMarkdown(),
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

export const createSchema = (props: Props) => {
  const newTextConfig = createEmptyState({
    config: props.config,
    markdown: props.markdown,
    path: props.path,
    keymap: props.keymap,
    y: props.y,
  })

  let schemaSpec = {nodes: {}}
  for (const extension of newTextConfig.extensions) {
    if (extension.schema) {
      schemaSpec = extension.schema(schemaSpec)
    }
  }

  return new Schema(schemaSpec)
}
