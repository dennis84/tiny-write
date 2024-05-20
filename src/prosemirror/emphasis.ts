import {DOMOutputSpec} from 'prosemirror-model'
import {markInputRule} from '@/prosemirror/rulebuilders'

export const emphasisSchemaSpec = {
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

export const strikethroughRule = markInputRule(/(?:~~)(.+)(?:~~)$/, 'strikethrough')
export const strongRule = markInputRule(/(?:\*\*)(.+)(?:\*\*)$/, 'strong')
export const strongRule2 = markInputRule(/(?:__)(.+)(?:__)$/, 'strong')
export const italicRule = markInputRule(/(?:^|\s)(?:\*)((?:[^*]+))(?:\*)$/, 'em')
export const emphasisInputRules = [
  strikethroughRule,
  strongRule,
  strongRule2,
  italicRule,
]
