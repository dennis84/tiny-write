import {
  type DOMOutputSpec,
  DOMSerializer,
  type Node,
  type NodeType,
  type Schema,
} from 'prosemirror-model'
import type {EditorView} from 'prosemirror-view'
import {inputRules, wrappingInputRule} from 'prosemirror-inputrules'
import {liftListItem, sinkListItem, splitListItem} from 'prosemirror-schema-list'
import {keymap} from 'prosemirror-keymap'
import type {ViewConfig} from '@/services/ProseMirrorService'

export const taskListSchemaSpec = {
  nodes: {
    task_list_item: {
      content: 'paragraph block*',
      defining: true,
      attrs: {checked: {default: false}},
      toDOM(node: Node): DOMOutputSpec {
        return [
          'li',
          {class: `task-list-item ${node.attrs.checked ? 'checked' : ''}`},
          [
            'input',
            {
              type: 'checkbox',
              ...(node.attrs.checked ? {checked: 'checked'} : {}),
            },
          ],
          ['div', 0],
        ]
      },
    },
    task_list: {
      content: 'task_list_item+',
      group: 'block',
      attrs: {tight: {default: true}},
      toDOM(): DOMOutputSpec {
        return ['ul', {class: 'task-list'}, 0]
      },
    },
  },
}

const todoListRule = (nodeType: NodeType) =>
  wrappingInputRule(/^\[( |x)]\s$/, nodeType, (match) => ({
    checked: match[1] === 'x',
  }))

class TaskListItemView {
  dom: HTMLInputElement
  contentDOM?: HTMLElement

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    const dom = this.node.type.spec.toDOM?.(this.node)
    const res = DOMSerializer.renderSpec(document, dom)
    this.dom = res.dom as HTMLInputElement
    this.contentDOM = res.contentDOM
    const input = this.dom.querySelector('input')
    if (input) input.onclick = this.handleClick.bind(this)
  }

  handleClick(e: MouseEvent) {
    const tr = this.view.state.tr
    const elem = e.target as HTMLInputElement
    const nodePos = this.getPos()
    if (nodePos === undefined) return

    tr.setNodeMarkup(nodePos, null, {checked: elem.checked})
    this.view.dispatch(tr)
    this.view.focus()
  }
}

const todoListKeymap = (schema: Schema) => ({
  Enter: splitListItem(schema.nodes.task_list_item),
  'Mod-[': liftListItem(schema.nodes.task_list_item),
  'Mod-]': sinkListItem(schema.nodes.task_list_item),
})

export const createTaskListKeymap = (schema: Schema) => keymap(todoListKeymap(schema))

export const createTaskListPlugin = (schema: Schema) =>
  inputRules({rules: [todoListRule(schema.nodes.task_list_item)]})

export const taskListViews: ViewConfig = {
  nodeViews: {
    task_list_item: (node, view, getPos) => {
      return new TaskListItemView(node, view, getPos)
    },
  },
}
