import * as Y from 'yjs'
import {Plugin} from 'prosemirror-state'
import * as base from '@/prosemirror/base'
import * as markdown from '@/prosemirror/markdown'
import * as inputParser from '@/prosemirror/input-parser'
import * as scroll from '@/prosemirror/scroll'
import * as todoList from '@/prosemirror/task-list'
import * as code from '@/prosemirror/code'
import * as emphasis from '@/prosemirror/emphasis'
import * as placeholder from '@/prosemirror/placeholder'
import * as codeBlock from '@/prosemirror/code-block'
import * as blockHandle from '@/prosemirror/block-handle'
import * as pasteMarkdown from '@/prosemirror/paste-markdown'
import * as table from '@/prosemirror/table'
import * as collab from '@/prosemirror/collab'
import * as image from '@/prosemirror/image'
import * as selected from '@/prosemirror/selected'
import * as container from '@/prosemirror/container'
import * as fileListing from '@/prosemirror/autocomplete/file-listing'
import * as wordCompletion from '@/prosemirror/autocomplete/word-completion'
import * as taskList from '@/prosemirror/task-list'
import {Ctrl} from '@/services'
import {plainSchema, schema} from '@/prosemirror/schema'
import {isTauri} from '@/env'

interface Props {
  ctrl: Ctrl;
  type?: Y.XmlFragment;
  markdown?: boolean;
  dropcursor?: boolean;
}

export const createPlugins = (props: Props): Plugin[] => {
  const isMarkdown = props.markdown ?? false

  const s = isMarkdown ? plainSchema : schema

  const plugins = [
    ...base.plugins(s, props.dropcursor),
    ...placeholder.plugins('Start typing ...'),
    ...scroll.plugins(props.ctrl),
    ...blockHandle.plugins(),
  ]

  if (props.type) {
    plugins.push(...collab.plugins(props.ctrl, props.type))
  }

  if (!isMarkdown) {
    plugins.push(...[
      ...markdown.plugins(s),
      ...todoList.plugins(s),
      ...codeBlock.plugins(s),
      ...code.plugins(s),
      ...emphasis.plugins(s),
      ...inputParser.plugins(s),
      ...table.plugins(props.ctrl, s),
      ...container.plugins(s),
      ...selected.plugins(),
      ...pasteMarkdown.plugins(s),
    ])
  }

  // Must be added after table for higher prio of keymap
  if (isTauri()) {
    plugins.push(...fileListing.plugins(props.ctrl))
  }
  plugins.push(...wordCompletion.plugins(props.ctrl))

  return plugins
}

export const createNodeViews = (ctrl: Ctrl) => {
  let nodeViews = {}

  const views = [
    codeBlock.views(ctrl),
    taskList.views(),
    container.views(),
    image.views(ctrl),
  ]

  for (const v of views) {
    if (v.nodeViews) nodeViews = {...nodeViews, ...v.nodeViews}
  }

  return {nodeViews}
}

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
