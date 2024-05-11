import {Node, Schema} from 'prosemirror-model'
import {paragraphSchemaSpec} from './extensions/paragraph'
import {headingSchemaSpec} from './extensions/heading'
import {listSchemaSpec} from './extensions/list'
import {hardBreakSchemaSpec} from './extensions/hard-break'
import {emphasisSchemaSpec} from './extensions/emphasis'
import {linkSchemaSpec} from './extensions/link'
import {codeSchemaSpec} from './extensions/code'
import {imageSchemaSpec} from './extensions/image'
import {markdownSchemaSpec} from './extensions/markdown'
import {collabSchemaSpec} from './extensions/collab'
import {containerSchemaSpec} from './extensions/container'
import {codeBlockSchemaSpec} from './extensions/code-block'
import {tableSchemaSpec} from './extensions/table'
import {taskListSchemaSpec} from './extensions/task-list'

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
    ...paragraphSchemaSpec.nodes,
    ...headingSchemaSpec.nodes,
    ...listSchemaSpec.nodes,
    text: {
      group: 'inline',
    },
    ...markdownSchemaSpec.nodes,
    ...hardBreakSchemaSpec.nodes,
    blockquote: {
      content: 'block+',
      group: 'block',
      toDOM: () => ['div', ['blockquote', 0]],
    },
    ...containerSchemaSpec.nodes,
    ...codeBlockSchemaSpec.nodes,
    ...tableSchemaSpec.nodes,
    ...taskListSchemaSpec.nodes,
    ...imageSchemaSpec.nodes,
  },
  marks: {
    ...linkSchemaSpec.marks,
    ...codeSchemaSpec.marks,
    ...collabSchemaSpec.marks,
    ...emphasisSchemaSpec.marks,
  },
})
