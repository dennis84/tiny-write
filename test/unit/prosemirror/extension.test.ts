import {test} from 'vitest'
import {SchemaSpec} from 'prosemirror-model'
import { schema } from 'prosemirror-markdown'

const schema1: SchemaSpec = {
  nodes: {
    doc: {
      content: 'block+'
    },
    h1: {
      content: 'inline*',
      group: 'block',
    },
  },
  marks: {
    link: {
      attrs: {href: {default: null}},
    }
  }
}

const schema2: SchemaSpec = {
  nodes: {
    h2: {
      content: 'inline*',
      group: 'block',
    },
  },
}

test('create extensions', () => {
  console.log(schema.spec)
  // console.log({
  //   ...schema,
  //   ...schema1,
  //   ...schema2
  // })
})
