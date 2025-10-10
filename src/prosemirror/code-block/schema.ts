import type {DOMOutputSpec} from 'prosemirror-model'

export const codeBlockSchemaSpec = {
  nodes: {
    code_block: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      selectable: true,
      // marks: 'ychange',
      attrs: {
        lang: {default: null},
        hidden: {default: false},
      },
      toDOM(): DOMOutputSpec {
        return ['pre', {}, ['code', 0]]
      },
    },
  },
}
