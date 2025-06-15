import type {EditorState, Plugin} from 'prosemirror-state'
import type {NodeViewConstructor} from 'prosemirror-view'
import {type Node, Schema} from 'prosemirror-model'
import {dropCursor} from 'prosemirror-dropcursor'
import {baseKeymap} from 'prosemirror-commands'
import {keymap} from 'prosemirror-keymap'
import {inputRules} from 'prosemirror-inputrules'
import {buildKeymap} from 'prosemirror-example-setup'
import type * as Y from 'yjs'
import {initProseMirrorDoc} from 'y-prosemirror'
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
import {
  codeBlockKeymap,
  createCodeBlockPlugin,
  createCodeBlockViews,
  codeBlockSchemaSpec,
} from '@/prosemirror/code-block'
import {createTablePlugins, tableKeymap, tableSchemaSpec} from '@/prosemirror/table'
import {
  createTaskListPlugin,
  createTaskListKeymap,
  taskListViews,
  taskListSchemaSpec,
} from '@/prosemirror/task-list'
import {createTabKeymap} from '@/prosemirror/tab'
import {createInputParserPlugin} from '@/prosemirror/input-parser'
import {scrollIntoView} from '@/prosemirror/scroll'
import {placeholder} from '@/prosemirror/placeholder'
import {createPasteMarkdownPlugin} from '@/prosemirror/paste-markdown'
import {selectedPlugin} from '@/prosemirror/selected'
import {createFileListingPlugin, fileListingKeymap} from '@/prosemirror/autocomplete/file-listing'
import {
  createWordCompletionPlugins,
  wordCompletionKeymap,
} from '@/prosemirror/autocomplete/word-completion'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/markdown'
import type {ConfigService} from './ConfigService'
import type {CollabService} from './CollabService'
import type {AppService} from './AppService'
import type {CodeMirrorService} from './CodeMirrorService'
import type {CanvasService} from './CanvasService'

export interface ViewConfig {
  nodeViews?: NodeViewConfig
}

export type NodeViewConfig = Record<string, NodeViewConstructor>

interface CreatePlugins {
  type: Y.XmlFragment
  dropCursor?: boolean
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
  constructor(
    private configService: ConfigService,
    private collabService: CollabService,
    private appService: AppService,
    private codeMirrorService: CodeMirrorService,
    private canvasService: CanvasService,
  ) {}

  static isEmpty(state?: EditorState) {
    return (
      !state ||
      state.doc.childCount === 0 ||
      (state.doc.childCount === 1 &&
        !state.doc.firstChild?.type.spec.code &&
        state.doc.firstChild?.isTextblock &&
        state.doc.firstChild.content.size === 0)
    )
  }

  static createEmptyText() {
    return {
      doc: {
        type: 'doc',
        content: [{type: 'paragraph'}],
      },
      selection: {
        type: 'text',
        anchor: 1,
        head: 1,
      },
    }
  }

  createPlugins(props: CreatePlugins): {plugins: Plugin[]; doc: Node | undefined} {
    const plugins = [
      // keymap
      wordCompletionKeymap,
      fileListingKeymap,
      createTaskListKeymap(schema),
      createTabKeymap(schema),
      tableKeymap,
      keymap(buildKeymap(schema)),
      keymap(baseKeymap),
      codeBlockKeymap,
      codeKeymap,
      // plugins
      placeholder('Start typing ...'),
      scrollIntoView(this.configService),
      createMarkdownPlugins(schema),
      createTaskListPlugin(schema),
      createCodeBlockPlugin(schema),
      inputRules({rules: [codeInputRule, ...emphasisInputRules]}),
      createInputParserPlugin(createMarkdownParser(schema)),
      ...createTablePlugins(schema),
      createContainerPlugin(schema),
      selectedPlugin,
      createPasteMarkdownPlugin(schema),
    ]

    let doc: Node
    const result = initProseMirrorDoc(props.type, schema)
    if (result.doc.childCount === 0)
      doc = schema.topNodeType.create({}, schema.nodes.paragraph.create())
    else doc = result.doc

    plugins.push(
      ...createCollabPlugins(
        props.type,
        this.collabService.permanentUserData!,
        this.collabService.provider?.awareness,
        result.mapping,
        this.collabService.isSnapshot,
      ),
    )

    if (props.dropCursor) {
      plugins.push(dropCursor({class: 'drop-cursor'}))
    }

    if (isTauri()) plugins.push(createFileListingPlugin(this.appService))
    plugins.push(...createWordCompletionPlugins)

    return {plugins, doc}
  }

  createNodeViews() {
    let nodeViews = {}

    const views = [
      createCodeBlockViews(this.configService, this.codeMirrorService),
      taskListViews,
      containerViews,
      createImageViews(this.appService, this.canvasService),
    ]

    for (const v of views) {
      if (v.nodeViews) nodeViews = {...nodeViews, ...v.nodeViews}
    }

    return {nodeViews}
  }
}
