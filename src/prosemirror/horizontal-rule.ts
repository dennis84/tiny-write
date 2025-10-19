import type {DOMOutputSpec} from 'prosemirror-model'

export const horizontalRuleSchemaSpec = {
  nodes: {
    horizontal_rule: {
      content: 'inline*',
      group: 'block',
      atom: true,
      draggable: true,
      selectable: true,
      toDOM(): DOMOutputSpec {
        return ['div', {class: 'horizontal-rule'}, 0]
      },
    },
  },
}
