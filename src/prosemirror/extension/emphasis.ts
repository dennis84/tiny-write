import {inputRules} from 'prosemirror-inputrules'
import {MarkType} from 'prosemirror-model'
import {markInputRule} from './mark-input-rule'
import {ProseMirrorExtension} from '../state'

const strikethroughRule = (nodeType: MarkType) =>
  markInputRule(/(?:~~)(.+)(?:~~)$/, nodeType)

const strongRule = (nodeType: MarkType) =>
  markInputRule(/(?:\*\*)(.+)(?:\*\*)$/, nodeType)

const strongRule2 = (nodeType: MarkType) =>
  markInputRule(/(?:__)(.+)(?:__)$/, nodeType)

const italicRule = (nodeType: MarkType) =>
  markInputRule(/(?:\*)(.+)(?:\*)$/, nodeType)

const strikethroughSchema = {
  strikethrough: {
    toDOM: () => ['del'],
  },
}

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    marks: (prev.marks as any).append(strikethroughSchema),
  }),
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: [
      strikethroughRule(schema.marks.strikethrough),
      strongRule(schema.marks.strong),
      strongRule2(schema.marks.strong),
      italicRule(schema.marks.em),
    ]}),
  ]
})
