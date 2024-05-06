import {DOMOutputSpec} from 'prosemirror-model'

export const schemaSpec = {
  nodes: {
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      toDOM(): DOMOutputSpec {
        return ['br']
      },
    },
  }
}
