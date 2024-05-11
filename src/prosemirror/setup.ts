import * as Y from 'yjs'
import {Plugin} from 'prosemirror-state'
import {dropCursor} from 'prosemirror-dropcursor'
import {baseKeymap} from 'prosemirror-commands'
import {keymap} from 'prosemirror-keymap'
import {inputRules} from 'prosemirror-inputrules'
import {buildKeymap} from 'prosemirror-example-setup'
import {createTabKeymap} from '@/prosemirror/extensions/tab'
import {createMarkdownPlugins} from '@/prosemirror/extensions/markdown'
import {createInputParserPlugin} from '@/prosemirror/extensions/input-parser'
import {scrollIntoView} from '@/prosemirror/extensions/scroll'
import {createTaskListPlugin, createTaskListKeymap, taskListViews} from '@/prosemirror/extensions/task-list'
import {codeInputRule, codeKeymap} from '@/prosemirror/extensions/code'
import {emphasisInputRules} from '@/prosemirror/extensions/emphasis'
import {placeholder} from '@/prosemirror/extensions/placeholder'
import {codeBlockKeymap, createCodeBlockPlugin, createCodeBlockViews} from '@/prosemirror/extensions/code-block'
import {blockHandle} from '@/prosemirror/extensions/block-handle'
import {createPasteMarkdownPlugin} from '@/prosemirror/extensions/paste-markdown'
import {createTablePlugins, tableKeymap} from '@/prosemirror/extensions/table'
import {createCollabPlugins} from '@/prosemirror/extensions/collab'
import {createImageViews} from '@/prosemirror/extensions/image'
import {selectedPlugin} from '@/prosemirror/extensions/selected'
import {containerViews, createContainerPlugin} from '@/prosemirror/extensions/container'
import {createFileListingPlugin, fileListingKeymap} from '@/prosemirror/extensions/autocomplete/file-listing'
import {createWordCompletionPlugins, wordCompletionKeymap} from '@/prosemirror/extensions/autocomplete/word-completion'
import {Ctrl} from '@/services'
import {schema} from '@/prosemirror/schema'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/markdown'

interface Props {
  ctrl: Ctrl;
  type?: Y.XmlFragment;
  dropCursor?: boolean;
}

export const createPlugins = (props: Props): Plugin[] => {
  const plugins = [
    // keymap
    wordCompletionKeymap,
    createTaskListKeymap(schema),
    createTabKeymap(schema),
    tableKeymap,
    keymap(buildKeymap(schema)),
    keymap(baseKeymap),
    codeBlockKeymap,
    codeKeymap,
    fileListingKeymap,

    placeholder('Start typing ...'),
    scrollIntoView(props.ctrl),
    blockHandle,
    createMarkdownPlugins(schema),
    createTaskListPlugin(schema),
    createCodeBlockPlugin(schema),
    inputRules({rules: [
      codeInputRule,
      ...emphasisInputRules,
    ]}),
    createInputParserPlugin(createMarkdownParser(schema)),
    ...createTablePlugins(props.ctrl, schema),
    createContainerPlugin(schema),
    selectedPlugin,
    createPasteMarkdownPlugin(schema),
  ]

  if (props.type) {
    plugins.push(...createCollabPlugins(props.ctrl, props.type))
  }

  if (props.dropCursor) {
    plugins.push(dropCursor({class: 'drop-cursor'}))
  }

  if (isTauri()) plugins.push(createFileListingPlugin(props.ctrl))
  plugins.push(...createWordCompletionPlugins(props.ctrl))

  return plugins
}

export const createNodeViews = (ctrl: Ctrl) => {
  let nodeViews = {}

  const views = [
    createCodeBlockViews(ctrl),
    taskListViews,
    containerViews,
    createImageViews(ctrl),
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
