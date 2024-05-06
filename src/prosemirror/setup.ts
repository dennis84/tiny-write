import * as Y from 'yjs'
import {Plugin} from 'prosemirror-state'
import * as base from '@/prosemirror/extensions/base'
import * as markdown from '@/prosemirror/extensions/markdown'
import * as inputParser from '@/prosemirror/extensions/input-parser'
import * as scroll from '@/prosemirror/extensions/scroll'
import * as todoList from '@/prosemirror/extensions/task-list'
import * as code from '@/prosemirror/extensions/code'
import * as emphasis from '@/prosemirror/extensions/emphasis'
import * as placeholder from '@/prosemirror/extensions/placeholder'
import * as codeBlock from '@/prosemirror/extensions/code-block'
import * as blockHandle from '@/prosemirror/extensions/block-handle'
import * as pasteMarkdown from '@/prosemirror/extensions/paste-markdown'
import * as table from '@/prosemirror/extensions/table'
import * as collab from '@/prosemirror/extensions/collab'
import * as image from '@/prosemirror/extensions/image'
import * as selected from '@/prosemirror/extensions/selected'
import * as container from '@/prosemirror/extensions/container'
import * as fileListing from '@/prosemirror/extensions/autocomplete/file-listing'
import * as wordCompletion from '@/prosemirror/extensions/autocomplete/word-completion'
import * as taskList from '@/prosemirror/extensions/task-list'
import {Ctrl} from '@/services'
import {plainSchema, schema} from '@/prosemirror/schema'
import {isTauri} from '@/env'

interface Props {
  ctrl: Ctrl;
  type?: Y.XmlFragment;
  markdown?: boolean;
  dropCursor?: boolean;
}

export const createPlugins = (props: Props): Plugin[] => {
  const isMarkdown = props.markdown ?? false

  const s = isMarkdown ? plainSchema : schema

  const plugins = [
    ...base.plugins(s, props.dropCursor),
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
