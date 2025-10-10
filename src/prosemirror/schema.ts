import {Schema} from 'prosemirror-model'
import {codeSchemaSpec} from './code'
import {codeBlockSchemaSpec} from './code-block/schema'
import {collabSchemaSpec} from './collab'
import {containerSchemaSpec} from './container'
import {emphasisSchemaSpec} from './emphasis'
import {hardBreakSchemaSpec} from './hard-break'
import {headingSchemaSpec} from './heading'
import {imageSchemaSpec} from './image/schema'
import {linkSchemaSpec} from './link'
import {listSchemaSpec} from './list'
import {markdownSchemaSpec} from './markdown'
import {paragraphSchemaSpec} from './paragraph'
import {tableSchemaSpec} from './table'
import {taskListSchemaSpec} from './task-list'

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
    ...codeSchemaSpec.marks,
    ...linkSchemaSpec.marks,
    ...collabSchemaSpec.marks,
    ...emphasisSchemaSpec.marks,
  },
})
