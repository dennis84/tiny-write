import {DOMSerializer} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {wrappingInputRule} from 'prosemirror-inputrules'
import {splitListItem} from 'prosemirror-schema-list'
import {keymap} from 'prosemirror-keymap'
import {inputRules} from 'prosemirror-inputrules'

const todoListRule = (nodeType) =>
  wrappingInputRule(
    new RegExp('^\\[( |x)]\\s$'),
    nodeType,
    match => ({
      done: match[1] === 'x',
    }),
  )

const todoListSchema = {
  todo_item: {
    content: 'paragraph block*',
    defining: true,
    group: 'block',
    attrs: {done: {default: false}},
    parseDOM: [{
      tag: 'div',
      getAttrs: (dom) => ({
        done: dom.querySelector('input').checked,
      }),
    }],
    toDOM: (node) => [
      'div',
      {class: `todo-item ${node.attrs.done ? 'done' : ''}`},
      ['input', {type: 'checkbox', ...(node.attrs.done ? {checked: 'checked'} : {})}],
      ['span', 0],
    ],
  },
}

class TodoItemView {
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
    this.view.focus()
  }
}

const todoListKeymap = (schema) => ({
  'Enter': splitListItem(schema.nodes.todo_item),
})

export default {
  schema: (prev) => ({
    ...prev,
    nodes: prev.nodes.append(todoListSchema),
  }),
  plugins: (prev, schema) => [
    keymap(todoListKeymap(schema)),
    ...prev,
    inputRules({rules: [todoListRule(schema.nodes.todo_item)]}),
  ],
  nodeViews: {
    todo_item: (node, view, getPos) => {
      return new TodoItemView(node, view, getPos)
    }
  }
}
