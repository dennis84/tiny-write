import type {DOMOutputSpec} from 'prosemirror-model'

export const paragraphSchemaSpec = {
  nodes: {
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM(): DOMOutputSpec {
        return ['p', 0]
      },
    },
  },
}
