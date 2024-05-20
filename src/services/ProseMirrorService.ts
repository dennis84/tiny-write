import {EditorState, Plugin} from 'prosemirror-state'
import {NodeViewConstructor} from 'prosemirror-view'
import {Schema} from 'prosemirror-model'
import {dropCursor} from 'prosemirror-dropcursor'
import {baseKeymap} from 'prosemirror-commands'
import {keymap} from 'prosemirror-keymap'
import {inputRules} from 'prosemirror-inputrules'
import {buildKeymap} from 'prosemirror-example-setup'
import * as Y from 'yjs'
import {paragraphSchemaSpec} from '@/prosemirror/paragraph'
import {headingSchemaSpec} from '@/prosemirror/heading'
import {listSchemaSpec} from '@/prosemirror/list'
import {hardBreakSchemaSpec} from '@/prosemirror/hard-break'
import {emphasisInputRules, emphasisSchemaSpec} from '@/prosemirror/emphasis'
import {linkSchemaSpec} from '@/prosemirror/link'
import {codeInputRule, codeKeymap, codeSchemaSpec} from '@/prosemirror/code'
import {createImageViews, imageSchemaSpec} from '@/prosemirror/image'
import {createMarkdownPlugins, markdownSchemaSpec} from '@/prosemirror/markdown'
import {createCollabPlugins, collabSchemaSpec} from '@/prosemirror/collab'
import {containerViews, createContainerPlugin, containerSchemaSpec} from '@/prosemirror/container'
import {codeBlockKeymap, createCodeBlockPlugin, createCodeBlockViews, codeBlockSchemaSpec} from '@/prosemirror/code-block'
import {createTablePlugins, tableKeymap, tableSchemaSpec} from '@/prosemirror/table'
import {createTaskListPlugin, createTaskListKeymap, taskListViews, taskListSchemaSpec} from '@/prosemirror/task-list'
import {createTabKeymap} from '@/prosemirror/tab'
import {createInputParserPlugin} from '@/prosemirror/input-parser'
import {scrollIntoView} from '@/prosemirror/scroll'
import {placeholder} from '@/prosemirror/placeholder'
import {blockHandle} from '@/prosemirror/block-handle'
import {createPasteMarkdownPlugin} from '@/prosemirror/paste-markdown'
import {selectedPlugin} from '@/prosemirror/selected'
import {createFileListingPlugin, fileListingKeymap} from '@/prosemirror/autocomplete/file-listing'
import {createWordCompletionPlugins, wordCompletionKeymap} from '@/prosemirror/autocomplete/word-completion'
import {Ctrl} from '@/services'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/markdown'

export interface ViewConfig {
  nodeViews?: NodeViewConfig;
}

export type NodeViewConfig = Record<string, NodeViewConstructor>;

interface CreatePlugins {
  ctrl: Ctrl;
  type?: Y.XmlFragment;
  dropCursor?: boolean;
}

export const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
    },
    ...paragraphSchemaSpec.nodes,
    ...headingSchemaSpec.nodes,
    ...listSchemaSpec.nodes,
    text: {
      group: 'inline',
    },
    ...markdownSchemaSpec.nodes,
    ...hardBreakSchemaSpec.nodes,
    blockquote: {
      content: 'block+',
      group: 'block',
      toDOM: () => ['div', ['blockquote', 0]],
    },
    ...containerSchemaSpec.nodes,
    ...codeBlockSchemaSpec.nodes,
    ...tableSchemaSpec.nodes,
    ...taskListSchemaSpec.nodes,
    ...imageSchemaSpec.nodes,
  },
  marks: {
    ...linkSchemaSpec.marks,
    ...codeSchemaSpec.marks,
    ...collabSchemaSpec.marks,
    ...emphasisSchemaSpec.marks,
  },
})

export class ProseMirrorService {

  static isEmpty(state?: EditorState) {
    return !state || (
      state.doc.childCount == 1 &&
      !state.doc.firstChild?.type.spec.code &&
      state.doc.firstChild?.isTextblock &&
      state.doc.firstChild.content.size == 0
    )
  }

  static createPlugins(props: CreatePlugins): Plugin[] {
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

  static createNodeViews(ctrl: Ctrl) {
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

  static createEmptyText() {
    return ({
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
  }
}
