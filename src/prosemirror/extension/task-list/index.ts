import {DOMSerializer, Node as ProsemirrorNode, NodeType, Schema} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {inputRules, wrappingInputRule} from 'prosemirror-inputrules'
import {liftListItem, sinkListItem, splitListItem} from 'prosemirror-schema-list'
import {keymap} from 'prosemirror-keymap'
import {ProseMirrorExtension} from '../../state'

const todoListRule = (nodeType: NodeType) =>
  wrappingInputRule(
    new RegExp('^\\[( |x)]\\s$'),
    nodeType,
    match => ({
      checked: match[1] === 'x',
    }),
  )

const todoListSchema = {
  task_list_item: {
    content: 'paragraph block*',
    defining: true,
    attrs: {checked: {default: false}},
    toDOM: (node) => [
      'li',
      {class: `task-list-item ${node.attrs.checked ? 'checked' : ''}`},
      ['input', {
        type: 'checkbox',
        ...(node.attrs.checked ? {checked: 'checked'} : {}),
      }],
      ['div', 0],
    ]
  },
  task_list: {
    content: 'task_list_item+',
    group: 'block',
    attrs: {tight: {default: true}},
    toDOM: () => ['ul', {class: 'task-list'}, 0]
  }
}

class TaskListItemView {
  dom: HTMLInputElement
  contentDOM: HTMLElement

  constructor(
    private node: ProsemirrorNode,
    private view: EditorView,
    private getPos: () => number
  ) {
    const dom = this.node.type.spec.toDOM(this.node)
    const res = DOMSerializer.renderSpec(document, dom)
    this.dom = res.dom as HTMLInputElement
    this.contentDOM = res.contentDOM
    this.dom.querySelector('input').onclick = this.handleClick.bind(this)
  }

  handleClick(e: MouseEvent) {
    const tr = this.view.state.tr
    const elem = e.target as HTMLInputElement
    tr.setNodeMarkup(this.getPos(), null, {checked: elem.checked})
    this.view.dispatch(tr)
    this.view.focus()
  }
}

const todoListKeymap = (schema: Schema) => ({
  'Enter': splitListItem(schema.nodes.task_list_item),
  'Mod-[': liftListItem(schema.nodes.task_list_item),
  'Mod-]': sinkListItem(schema.nodes.task_list_item),
})

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any).append(todoListSchema),
  }),
  plugins: (prev, schema) => [
    keymap(todoListKeymap(schema)),
    ...prev,
    inputRules({rules: [todoListRule(schema.nodes.task_list_item)]}),
  ],
  nodeViews: {
    task_list_item: (node, view, getPos) => {
      return new TaskListItemView(node, view, getPos)
    }
  }
})
