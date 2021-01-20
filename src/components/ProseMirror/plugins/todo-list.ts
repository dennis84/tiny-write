import {Plugin, PluginKey} from 'prosemirror-state'
import {DOMSerializer} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {wrappingInputRule} from 'prosemirror-inputrules'
import {splitListItem} from 'prosemirror-schema-list'

export const todoListRule = (nodeType) =>
  wrappingInputRule(
    new RegExp('^\\[\\s\\]\\s$'),
    nodeType,
  )

export const todoListSchema = {
  todo_list: {
    content: 'todo_item+',
    group: 'block',
    parseDOM: [{tag: 'div'}],
    toDOM: () => ['div', {class: 'todo-list'}, 0],
  },
  todo_item: {
    content: 'paragraph+',
    defining: true,
    attrs: {done: {default: false}},
    parseDOM: [{
      tag: 'div',
      getAttrs: (dom) => ({
        done: dom.querySelector('input').checked,
      }),
    }],
    toDOM: (node) => [
      'div',
      {class: node.attrs.done ? 'done' : ''},
      ['input', {type: 'checkbox', ...(node.attrs.done ? {checked: 'checked'} : {})}],
      ['span', 0],
    ],
  },
}

export const todoListKeymap = (schema) => ({
  'Enter': splitListItem(schema.nodes.todo_item),
})

export const todoListPlugin = new Plugin({
  key: new PluginKey('todo-list'),
  props: {
    nodeViews: {
      todo_item: (node, view, getPos) => {
        return new TodoItemView(node, view, getPos)
      }
    }
  }
})

export class TodoItemView {
  contentDOM: Element
  dom: Element
  view: EditorView
  getPos: () => number

  constructor(node, view, getPos) {
    const dom = node.type.spec.toDOM(node)
    const res = DOMSerializer.renderSpec(document, dom)
    this.dom = res.dom
    this.contentDOM = res.contentDOM
    this.view = view
    this.getPos = getPos
    this.dom.querySelector('input').onclick = this.handleClick.bind(this)
  }

  handleClick(e) {
    const tr = this.view.state.tr
    tr.setNodeMarkup(this.getPos(), null, {done: e.target.checked})
    this.view.dispatch(tr)
  }
}
