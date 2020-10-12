import {schema as markdownSchema} from 'prosemirror-markdown'
import {Schema} from 'prosemirror-model'

export const schema = new Schema({
  nodes: markdownSchema.spec.nodes,
  marks: markdownSchema.spec.marks,
})
