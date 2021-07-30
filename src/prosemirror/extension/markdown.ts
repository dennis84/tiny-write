import {
  inputRules,
  textblockTypeInputRule,
  wrappingInputRule,
  smartQuotes,
  emDash,
  ellipsis,
} from 'prosemirror-inputrules'

const blockQuoteRule = (nodeType) =>
  wrappingInputRule(/^\s*>\s$/, nodeType)

const orderedListRule = (nodeType) =>
  wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    match => ({order: +match[1]}),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  )

const bulletListRule = (nodeType) =>
  wrappingInputRule(/^\s*([-+*])\s$/, nodeType)

const headingRule = (nodeType, maxLevel) =>
  textblockTypeInputRule(
    new RegExp('^(#{1,' + maxLevel + '})\\s$'),
    nodeType,
    match => ({level: match[1].length})
  )

const markdownRules = (schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash)
  if (schema.nodes.blockquote) rules.push(blockQuoteRule(schema.nodes.blockquote))
  if (schema.nodes.ordered_list) rules.push(orderedListRule(schema.nodes.ordered_list))
  if (schema.nodes.bullet_list) rules.push(bulletListRule(schema.nodes.bullet_list))
  if (schema.nodes.heading) rules.push(headingRule(schema.nodes.heading, 6))
  return rules
}

export default {
  plugins: (prev, schema) => [
    ...prev,
    inputRules({rules: markdownRules(schema)}),
  ]
}
