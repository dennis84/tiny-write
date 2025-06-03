import type {DOMOutputSpec, Node} from 'prosemirror-model'

export const headingSchemaSpec = {
  nodes: {
    heading: {
      attrs: {level: {default: 1}},
      content: '(text | image)*',
      group: 'block',
      defining: true,
      toDOM(node: Node): DOMOutputSpec {
        return [`h${node.attrs.level}`, 0]
      },
    },
  },
}
