import {DOMOutputSpec, Mark} from 'prosemirror-model'

export const linkSchemaSpec = {
  marks: {
    link: {
      attrs: {
        href: {},
        title: {default: null},
      },
      inclusive: false,
      toDOM(node: Mark): DOMOutputSpec {
        return ['a', node.attrs]
      },
    },
    edit_link: {
      attrs: {href: {default: null}},
      toDOM(node: Mark): DOMOutputSpec {
        return ['span', {'class': 'edit-link', 'data-href': node.attrs.href}]
      },
    },
  },
}
