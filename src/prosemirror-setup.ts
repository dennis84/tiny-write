import {Schema} from 'prosemirror-model'
import * as Y from 'yjs'
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
import {collab} from '@/prosemirror/collab'
import select from '@/prosemirror/select'
import position from '@/prosemirror/position'
import container from '@/prosemirror/container'
import fileListing from '@/prosemirror/autocomplete/file-listing'
import wordCompletion from '@/prosemirror/autocomplete/word-completion'
import {isDev} from '@/env'
import {Ctrl} from '@/services'

interface Props {
  ctrl: Ctrl;
  type?: Y.XmlFragment;
  keymap?: {[key: string]: any};
  markdown?: boolean;
}

export const createExtensions = (props: Props): ProseMirrorExtension[] => {
  const isMarkdown = props.markdown ?? false
  const keymap = props.keymap ?? {}

  const extensions = [
    base({markdown: isMarkdown, keymap}),
    placeholder('Start typing ...'),
    scroll(props.ctrl),
    blockMenu(),
    fileListing(props.ctrl),
    wordCompletion(props.ctrl),
  ]

  if (props.type) {
    extensions.push(collab(props.ctrl, props.type))
  }

  if (isMarkdown) {
    return extensions
  }

  return [
    ...extensions,
    markdown(),
    todoList(),
    codeBlock({
      ctrl: props.ctrl,
      keymap: Object.entries(props.keymap ?? {}).map(([key, run]) => ({key, run})),
    }),
    code(),
    emphasis(),
    link(),
    table(),
    position(isDev),
    container(),
    select(props.ctrl),
    image(props.ctrl),
    pasteMarkdown(),
  ]
}

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
