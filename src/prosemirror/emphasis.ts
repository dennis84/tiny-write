import {inputRules} from 'prosemirror-inputrules'
import {DOMOutputSpec, MarkType} from 'prosemirror-model'
import {markInputRule} from '@/prosemirror/rulebuilders'
import {ProseMirrorExtension} from '@/prosemirror'

export const schemaSpec = {
  marks: {
    em: {
      toDOM(): DOMOutputSpec {
        return ['em']
      },
    },
    strong: {
      toDOM(): DOMOutputSpec {
        return ['strong']
      },
    },
    strikethrough: {
      toDOM(): DOMOutputSpec {
        return ['del']
      }
    },
  }
}

const strikethroughRule = (nodeType: MarkType) =>
  markInputRule(/(?:~~)(.+)(?:~~)$/, nodeType)

const strongRule = (nodeType: MarkType) =>
  markInputRule(/(?:\*\*)(.+)(?:\*\*)$/, nodeType)

const strongRule2 = (nodeType: MarkType) =>
  markInputRule(/(?:__)(.+)(?:__)$/, nodeType)

const italicRule = (nodeType: MarkType) =>
  markInputRule(/(?:^|\s)(?:\*)((?:[^*]+))(?:\*)$/, nodeType)

export default (): ProseMirrorExtension => ({
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
