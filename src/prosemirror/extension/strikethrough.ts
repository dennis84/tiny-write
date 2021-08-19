import {inputRules} from 'prosemirror-inputrules'
import {markInputRule} from './mark-input-rule'

const strikethroughRule = (nodeType) =>
  markInputRule(/(?:~~)(.+)(?:~~)$/, nodeType)

const strikethroughSchema = {
  strikethrough: {
    parseDOM: [{tag: 'del'}],
    toDOM: () => ["del"],
  },
}

export default {
  schema: (prev) => ({
    ...prev,
    marks: prev.marks.append(strikethroughSchema),
  }),
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [
      strikethroughRule(schema.marks.strikethrough),
    ]}),
  ]
}
