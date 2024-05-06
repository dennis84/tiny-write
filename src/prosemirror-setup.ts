import * as Y from 'yjs'
import {NodeViewConfig, ProseMirrorExtension} from '@/prosemirror'
import base from '@/prosemirror/base'
import markdown from '@/prosemirror/markdown'
import inputParser from '@/prosemirror/input-parser'
import scroll from '@/prosemirror/scroll'
import todoList from '@/prosemirror/task-list'
import code from '@/prosemirror/code'
import emphasis from '@/prosemirror/emphasis'
import placeholder from '@/prosemirror/placeholder'
import codeBlock from '@/prosemirror/code-block'
import image from '@/prosemirror/image'
import blockHandle from '@/prosemirror/block-handle'
import pasteMarkdown from '@/prosemirror/paste-markdown'
import table from '@/prosemirror/table'
import {collab} from '@/prosemirror/collab'
import selected from '@/prosemirror/selected'
import container from '@/prosemirror/container'
import fileListing from '@/prosemirror/autocomplete/file-listing'
import wordCompletion from '@/prosemirror/autocomplete/word-completion'
import {Ctrl} from '@/services'

interface Props {
  ctrl: Ctrl;
  type?: Y.XmlFragment;
  markdown?: boolean;
  dropcursor?: boolean;
}

export const createExtensions = (props: Props): ProseMirrorExtension[] => {
  const isMarkdown = props.markdown ?? false

  const extensions = [
    base({
      markdown: isMarkdown,
      dropcursor: props.dropcursor,
    }),
    placeholder('Start typing ...'),
    scroll(props.ctrl),
    blockHandle(),
  ]

  if (props.type) {
    extensions.push(collab(props.ctrl, props.type))
  }

  if (!isMarkdown) {
    extensions.push(...[
      markdown(),
      todoList(),
      codeBlock(props.ctrl),
      code(),
      emphasis(),
      inputParser(),
      table(props.ctrl),
      container(),
      selected(),
      image(props.ctrl),
      pasteMarkdown(),
    ])
  }

  return [
    ...extensions,
    // Must be added after table for higher prio of keymap
    fileListing(props.ctrl),
    wordCompletion(props.ctrl),
  ]
}

export const createNodeViews = (extensions: ProseMirrorExtension[]) =>
  extensions.reduce<NodeViewConfig>((acc, e) => e.nodeViews ? ({...acc, ...e.nodeViews}) : acc, {})

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
