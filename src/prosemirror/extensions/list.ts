import {DOMOutputSpec, Node} from 'prosemirror-model'

export const listSchemaSpec = {
  nodes: {
    ordered_list: {
      content: 'list_item+',
      group: 'block',
      attrs: {order: {default: 1}, tight: {default: false}},
      toDOM(node: Node): DOMOutputSpec {
        return [
          'ol',
          {
            start: node.attrs.order == 1 ? null : node.attrs.order,
            'data-tight': node.attrs.tight ? 'true' : null,
          },
          0,
        ]
      },
    },

    bullet_list: {
      content: 'list_item+',
      group: 'block',
      attrs: {tight: {default: false}},
      toDOM(node: Node): DOMOutputSpec {
        return ['ul', {'data-tight': node.attrs.tight ? 'true' : null}, 0]
      },
    },

    list_item: {
      content: 'block+',
      defining: true,
      toDOM(): DOMOutputSpec {
        return ['li', 0]
      },
    },
  }
}
