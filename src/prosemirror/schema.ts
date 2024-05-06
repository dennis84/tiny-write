import {Node, Schema} from 'prosemirror-model'
import * as paragraph from './paragraph'
import * as heading from './heading'
import * as list from './list'
import * as hardBreak from './hard-break'
import * as emphasis from './emphasis'
import * as link from './link'
import * as code from './code'
import * as collab from './collab'
import * as container from './container'
import * as codeBlock from './code-block'
import * as table from './table'
import * as taskList from './task-list'

export const plainSchema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      draggable: true,
      toDOM: (node: Node) => ['p', {class: node.content.size > 500 ? 'truncate' : undefined}, 0],
    },
    text: {
      group: 'inline'
    },
  }
})

export const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
    },
    ...paragraph.schemaSpec.nodes,
    ...heading.schemaSpec.nodes,
    ...list.schemaSpec.nodes,
    text: {
      group: 'inline',
    },
    ...hardBreak.schemaSpec.nodes,
    blockquote: {
      content: 'block+',
      group: 'block',
      toDOM: () => ['div', ['blockquote', 0]],
    },
    ...container.schemaSpec.nodes,
    ...codeBlock.schemaSpec.nodes,
    ...table.schemaSpec.nodes,
    ...taskList.schemaSpec.nodes,
  },
  marks: {
    ...link.schemaSpec.marks,
    ...code.schemaSpec.marks,
    ...collab.schemaSpec.marks,
    ...emphasis.schemaSpec.marks,
  },
})
