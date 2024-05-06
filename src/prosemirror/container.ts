import {DOMOutputSpec, DOMSerializer, Node, NodeType} from 'prosemirror-model'
import {TextSelection} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {inputRules, wrappingInputRule} from 'prosemirror-inputrules'
import {ProseMirrorExtension} from '@/prosemirror'

export const schemaSpec = {
  nodes: {
    container: {
      group: 'block',
      selectable: true,
      defining: true,
      content: 'block+',
      attrs: {
        type: {default: 'tip'},
        open: {default: true},
        summary: {default: 'Details'},
      },
      toDOM(node: Node): DOMOutputSpec {
        return node.attrs.type === 'details' ? [
          'details',
          {class: `container-${node.attrs.type}`, ...(node.attrs.open ? {open: ''} : {})},
          ['summary', {contenteditable: 'false'}, node.attrs.summary],
          ['div', 0],
        ] : [
          'div',
          {class: `container-${node.attrs.type}`},
          0
        ]
      }
    }
  }
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
    private getPos: () => number | undefined,
  ) {
    const dom = this.node.type.spec.toDOM!(this.node)
    const res = DOMSerializer.renderSpec(document, dom)
    this.dom = res.dom as HTMLInputElement
    this.contentDOM = res.contentDOM

    if (node.attrs.type === 'details') {
      this.dom.childNodes[0].addEventListener('click', () => {
        const tr = this.view.state.tr
        const open = !(this.dom as HTMLDetailsElement).open
        const nodePos = this.getPos()
        if (nodePos === undefined) return

        tr.setNodeMarkup(nodePos, null, {...node.attrs, open})
        if (!open) {
          tr.setSelection(new TextSelection(tr.doc.resolve(nodePos + 1)))
        }

        this.view.dispatch(tr)
      })
    }
  }
}

export default (): ProseMirrorExtension => ({
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
