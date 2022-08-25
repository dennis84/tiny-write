import {keymap} from 'prosemirror-keymap'
import {keymap as cmKeymap} from '@codemirror/view'
import {ProseMirrorExtension} from './prosemirror/state'
import {Schema} from 'prosemirror-model'
import base from './prosemirror/extension/base'
import markdown from './prosemirror/extension/markdown'
import link from './prosemirror/extension/link'
import scroll from './prosemirror/extension/scroll'
import todoList from './prosemirror/extension/task-list'
import code from './prosemirror/extension/code'
import emphasis from './prosemirror/extension/emphasis'
import placeholder from './prosemirror/extension/placeholder'
import codeBlock from './prosemirror/extension/code-block'
import image from './prosemirror/extension/image'
import dragHandle from './prosemirror/extension/drag-handle'
import pasteMarkdown from './prosemirror/extension/paste-markdown'
import table from './prosemirror/extension/table'
import collab from './prosemirror/extension/collab'
import select from './prosemirror/extension/select'
import position from './prosemirror/extension/position'
import {Config, YOptions} from './state'
import {codeTheme, font, selection, isDarkTheme} from './config'
import {isDev} from './env'

interface Props {
  data?: unknown;
  keymap?: any;
  config: Config;
  markdown: boolean;
  path?: string;
  y?: YOptions;
}

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

export const createExtensions = (props: Props): ProseMirrorExtension[] =>
  props.markdown ? [
    placeholder('Start typing ...'),
    customKeymap(props),
    base(props.markdown),
    scroll(props.config.typewriterMode),
    collab(props.y),
    dragHandle(),
  ] : [
    customKeymap(props),
    base(props.markdown),
    markdown(),
    todoList(),
    dragHandle(),
    codeBlock({
      theme: codeTheme(props.config),
      dark: isDarkTheme(props.config),
      typewriterMode: props.config.typewriterMode,
      fontSize: props.config.fontSize,
      font: font(props.config, true),
      prettier: props.config.prettier,
      extensions: () => [codeMirrorKeymap(props)],
    }),
    code(),
    emphasis(),
    link(),
    table(),
    position(isDev),
    select({background: selection(props.config)}),
    image(props.path),
    placeholder('Start typing ...'),
    scroll(props.config.typewriterMode),
    pasteMarkdown(),
    collab(props.y),
  ]

export const createEmptyText = () => ({
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
  const extensions = createExtensions({
    config: props.config,
    markdown: props.markdown,
    path: props.path,
    keymap: props.keymap,
    y: props.y,
  })

  let schemaSpec = {nodes: {}}
  for (const extension of extensions) {
    if (extension.schema) {
      schemaSpec = extension.schema(schemaSpec)
    }
  }

  return new Schema(schemaSpec)
}
