import {DOMOutputSpec} from 'prosemirror-model'

export const schemaSpec = {
  nodes: {
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM(): DOMOutputSpec {
        return ['p', 0]
      }
    },
  }
}
