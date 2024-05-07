import {
  inputRules,
  textblockTypeInputRule,
  wrappingInputRule,
  smartQuotes,
  emDash,
  ellipsis,
} from 'prosemirror-inputrules'
import {DOMOutputSpec, NodeType, Schema} from 'prosemirror-model'
import {nodeInputRule} from './rulebuilders'

const blockQuoteRule = (nodeType: NodeType) =>
  wrappingInputRule(/^\s*>\s$/, nodeType)

const orderedListRule = (nodeType: NodeType) =>
  wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    match => ({order: +match[1]}),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  )

const bulletListRule = (nodeType: NodeType) =>
  wrappingInputRule(/^\s*([-+*])\s$/, nodeType)

const headingRule = (nodeType: NodeType, maxLevel: number) =>
  textblockTypeInputRule(
    new RegExp('^(#{1,' + maxLevel + '})\\s$'),
    nodeType,
    match => ({level: match[1].length})
  )

const hrRule = (nodeType: NodeType) =>
  nodeInputRule(/^(?:---|—-|___\s|\*\*\*\s)$/, nodeType)

const markdownRules = (schema: Schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash)
  if (schema.nodes.blockquote) rules.push(blockQuoteRule(schema.nodes.blockquote))
  if (schema.nodes.ordered_list) rules.push(orderedListRule(schema.nodes.ordered_list))
  if (schema.nodes.bullet_list) rules.push(bulletListRule(schema.nodes.bullet_list))
  if (schema.nodes.heading) rules.push(headingRule(schema.nodes.heading, 6))
  if (schema.nodes.horizontal_rule) rules.push(hrRule(schema.nodes.horizontal_rule))
  return rules
}

export const schemaSpec = {
  nodes: {
    horizontal_rule: {
      content: 'inline*',
      group: 'block',
      atom: true,
      draggable: true,
      selectable: true,
      toDOM(): DOMOutputSpec {
        return ['div', {class: 'horizontal-rule'}, 0]
      }
    }
  }
}

export const plugin = (schema: Schema) => inputRules({rules: markdownRules(schema)})
