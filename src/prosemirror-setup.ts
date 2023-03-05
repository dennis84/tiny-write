import {Schema} from 'prosemirror-model'
import {keymap as cmKeymap} from '@codemirror/view'
import {NodeViewConfig, ProseMirrorExtension} from '@/prosemirror'
import base from '@/prosemirror/base'
import markdown from '@/prosemirror/markdown'
import link from '@/prosemirror/link'
import scroll from '@/prosemirror/scroll'
import todoList from '@/prosemirror/task-list'
import code from '@/prosemirror/code'
import emphasis from '@/prosemirror/emphasis'
import placeholder from '@/prosemirror/placeholder'
import codeBlock from '@/prosemirror/code-block'
import image from '@/prosemirror/image'
import blockMenu from '@/prosemirror/block-menu'
import pasteMarkdown from '@/prosemirror/paste-markdown'
import table from '@/prosemirror/table'
import {collab, CollabOptions} from '@/prosemirror/collab'
import select from '@/prosemirror/select'
import position from '@/prosemirror/position'
import container from '@/prosemirror/container'
import fileListing from '@/prosemirror/autocomplete/file-listing'
import wordCompletion from '@/prosemirror/autocomplete/word-completion'
import {Config} from '@/state'
import {codeTheme, fontFamily, primaryBackground, selection} from '@/config'
import {isDev} from '@/env'

interface Props {
  data?: unknown;
  keymap?: {[key: string]: any};
  config: Config;
  markdown?: boolean;
  fullscreen?: boolean;
  path?: string;
  y?: CollabOptions;
}

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
    base({markdown: props.markdown, keymap: props.keymap ?? {}}),
    scroll(props.config.typewriterMode),
    collab(props.y),
    blockMenu(),
    fileListing(props.config.fontSize),
    wordCompletion(props.config.fontSize),
  ] : [
    base({
      markdown: props.markdown ?? false,
      keymap: props.keymap ?? {},
    }),
    markdown(),
    todoList(),
    blockMenu(),
    codeBlock({
      theme: codeTheme(props.config).value,
      dark: codeTheme(props.config).dark,
      typewriterMode: props.config.typewriterMode,
      fontSize: props.config.fontSize,
      font: fontFamily(props.config, {monospace: true}),
      prettier: props.config.prettier,
      extensions: () => [codeMirrorKeymap(props)],
    }),
    code(),
    emphasis(),
    link(),
    table(),
    position(isDev),
    container(),
    select({
      background: selection(props.config),
      border: primaryBackground(props.config),
      fullscreen: props.fullscreen ?? false,
    }),
    image(props.path),
    placeholder('Start typing ...'),
    scroll(props.config.typewriterMode),
    pasteMarkdown(),
    collab(props.y),
    fileListing(props.config.fontSize),
    wordCompletion(props.config.fontSize),
  ]

export const createNodeViews = (extensions: ProseMirrorExtension[]) =>
  extensions.reduce<NodeViewConfig>((acc, e) => e.nodeViews ? ({...acc, ...e.nodeViews}) : acc, {})

export const createSchema = (extensions: ProseMirrorExtension[]) =>
  new Schema(extensions.reduce(
    (acc, e) => e.schema ? e.schema(acc) : acc,
    {nodes: {}}
  ))

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
