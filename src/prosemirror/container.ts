import {DOMSerializer, Node, NodeType} from 'prosemirror-model'
import {TextSelection} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {inputRules, wrappingInputRule} from 'prosemirror-inputrules'
import {ProseMirrorExtension} from '@/prosemirror'

const container = {
  group: 'block',
  selectable: true,
  defining: true,
  content: 'block+',
  attrs: {
    type: {default: 'tip'},
    open: {default: true},
    summary: {default: 'Details'},
  },
  toDOM: (node: Node) => node.attrs.type === 'details' ? [
    'details',
    {class: `container-${node.attrs.type}`, ...(node.attrs.open ? {open: ''} : {})},
    ['summary', {contenteditable: 'false'}, node.attrs.summary],
    ['div', 0],
  ] : [
    'div',
    {class: `container-${node.attrs.type}`},
    0
  ],
}

const containerRule = (nodeType: NodeType) =>
  wrappingInputRule(
    /^:::([a-z]*)?\s$/,
    nodeType,
    match => {
      const type = match[1]
      return type === 'tip' ? {type}
        : type === 'warning' ? {type}
        : type === 'details' ? {type}
        : {}
    }
  )

class ContainerView {
  dom: HTMLElement
  contentDOM?: HTMLElement

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number,
  ) {
    const dom = this.node.type.spec.toDOM!(this.node)
    const res = DOMSerializer.renderSpec(document, dom)
    this.dom = res.dom as HTMLInputElement
    this.contentDOM = res.contentDOM

    if (node.attrs.type === 'details') {
      this.dom.childNodes[0].addEventListener('click', () => {
        const tr = this.view.state.tr
        const open = !(this.dom as HTMLDetailsElement).open
        tr.setNodeMarkup(this.getPos(), null, {...node.attrs, open})
        if (!open) {
          tr.setSelection(new TextSelection(tr.doc.resolve(this.getPos() + 1)))
        }

        this.view.dispatch(tr)
      })
    }
  }
}

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any).update('container', container),
  }),
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [
      containerRule(schema.nodes.container),
    ]}),
  ],
  nodeViews: {
    container: (node, view, getPos) => {
      return new ContainerView(node, view, getPos)
    }
  }
})
