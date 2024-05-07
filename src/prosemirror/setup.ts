import * as Y from 'yjs'
import {Plugin} from 'prosemirror-state'
import {dropCursor} from 'prosemirror-dropcursor'
import {baseKeymap} from 'prosemirror-commands'
import {keymap} from 'prosemirror-keymap'
import {buildKeymap} from 'prosemirror-example-setup'
import * as tab from '@/prosemirror/extensions/tab'
import * as markdown from '@/prosemirror/extensions/markdown'
import * as inputParser from '@/prosemirror/extensions/input-parser'
import {scrollIntoView} from '@/prosemirror/extensions/scroll'
import * as taskList from '@/prosemirror/extensions/task-list'
import * as code from '@/prosemirror/extensions/code'
import * as emphasis from '@/prosemirror/extensions/emphasis'
import {placeholder} from '@/prosemirror/extensions/placeholder'
import * as codeBlock from '@/prosemirror/extensions/code-block'
import {blockHandle} from '@/prosemirror/extensions/block-handle'
import * as pasteMarkdown from '@/prosemirror/extensions/paste-markdown'
import * as table from '@/prosemirror/extensions/table'
import * as collab from '@/prosemirror/extensions/collab'
import * as image from '@/prosemirror/extensions/image'
import * as selected from '@/prosemirror/extensions/selected'
import * as container from '@/prosemirror/extensions/container'
import * as fileListing from '@/prosemirror/extensions/autocomplete/file-listing'
import * as wordCompletion from '@/prosemirror/extensions/autocomplete/word-completion'
import {Ctrl} from '@/services'
import {plainSchema, schema} from '@/prosemirror/schema'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/markdown'

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
    // keymap
    wordCompletion.keymap,
    taskList.keymap(s),
    tab.keymap(s),
    table.keymap,
    keymap(buildKeymap(s)),
    keymap(baseKeymap),
    codeBlock.keymap,
    code.keymap,
    fileListing.keymap,

    // plugins for all modes
    placeholder('Start typing ...'),
    scrollIntoView(props.ctrl),
    blockHandle,
  ]

  if (props.type) {
    plugins.push(...collab.plugins(props.ctrl, props.type))
  }

  if (props.dropCursor) {
    plugins.push(dropCursor())
  }

  if (!isMarkdown) {
    plugins.push(...[
      markdown.plugin(s),
      taskList.plugin(s),
      codeBlock.plugin(s),
      code.plugin(s),
      emphasis.plugin(s),
      inputParser.plugin(createMarkdownParser(s)),
      ...table.plugins(props.ctrl, s),
      container.plugin(s),
      selected.plugin,
      pasteMarkdown.plugin(s),
    ])
  }

  if (isTauri()) plugins.push(fileListing.plugin(props.ctrl))
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
