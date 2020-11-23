import {
  InputRule,
  inputRules,
  textblockTypeInputRule,
  wrappingInputRule,
  smartQuotes,
  emDash,
  ellipsis,
} from 'prosemirror-inputrules'

export const blockQuoteRule = (nodeType) =>
  wrappingInputRule(/^\s*>\s$/, nodeType)

export const orderedListRule = (nodeType) =>
  wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    match => ({order: +match[1]}),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  )

export const bulletListRule = (nodeType) =>
  wrappingInputRule(/^\s*([-+*])\s$/, nodeType)

export const codeBlockRule = (nodeType) =>
  textblockTypeInputRule(
    /^```([a-zA-Z]*)?\s$/,
    nodeType,
    match => {
      const lang = match[1]
      if (lang) return {params: lang}
      return {}
    }
  )

export const headingRule = (nodeType, maxLevel) =>
  textblockTypeInputRule(
    new RegExp('^(#{1,' + maxLevel + '})\\s$'),
    nodeType,
    match => ({level: match[1].length})
  )

export const codeRule = (nodeType) =>
  markInputRule(/(?:`)([^`]+)(?:`)$/, nodeType)

export const buildInputRules = (schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash)
  if (schema.nodes.blockquote) rules.push(blockQuoteRule(schema.nodes.blockquote))
  if (schema.nodes.ordered_list) rules.push(orderedListRule(schema.nodes.ordered_list))
  if (schema.nodes.bullet_list) rules.push(bulletListRule(schema.nodes.bullet_list))
  if (schema.nodes.code_block) rules.push(codeBlockRule(schema.nodes.code_block))
  if (schema.nodes.heading) rules.push(headingRule(schema.nodes.heading, 6))
  if (schema.marks.code) rules.push(codeRule(schema.marks.code))
  return inputRules({rules})
}

const markInputRule = (regexp, nodeType, getAttrs = undefined) =>
  new InputRule(regexp, (state, match, start, end) => {
    const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs
    const tr = state.tr
    if (match[1]) {
      const textStart = start + match[0].indexOf(match[1])
      const textEnd = textStart + match[1].length
      if (textEnd < end) tr.delete(textEnd, end)
      if (textStart > start) tr.delete(start, textStart)
      end = start + match[1].length
    }

    tr.addMark(start, end, nodeType.create(attrs))
    tr.removeStoredMark(nodeType)
    return tr
  })
