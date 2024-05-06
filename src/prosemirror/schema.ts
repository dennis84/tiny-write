import {Node, Schema} from 'prosemirror-model'
import * as paragraph from './extensions/paragraph'
import * as heading from './extensions/heading'
import * as list from './extensions/list'
import * as hardBreak from './extensions/hard-break'
import * as emphasis from './extensions/emphasis'
import * as link from './extensions/link'
import * as code from './extensions/code'
import * as image from './extensions/image'
import * as markdown from './extensions/markdown'
import * as collab from './extensions/collab'
import * as container from './extensions/container'
import * as codeBlock from './extensions/code-block'
import * as table from './extensions/table'
import * as taskList from './extensions/task-list'

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
    ...markdown.schemaSpec.nodes,
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
    ...image.schemaSpec.nodes,
  },
  marks: {
    ...link.schemaSpec.marks,
    ...code.schemaSpec.marks,
    ...collab.schemaSpec.marks,
    ...emphasis.schemaSpec.marks,
  },
})
