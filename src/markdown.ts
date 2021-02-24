import {MarkdownSerializer, defaultMarkdownSerializer} from 'prosemirror-markdown'

export const markdownSerializer = new MarkdownSerializer({
  ...defaultMarkdownSerializer.nodes,
  code_block(state, node) {
    state.write('```' + (node.attrs.params.lang || '') + '\n')
    state.text(node.textContent, false)
    state.ensureNewLine()
    state.write('```')
    state.closeBlock(node)
  },
  todo_list(state, node) {
    state.renderList(node, '', () => '')
  },
  todo_item(state, node) {
    state.write((node.attrs.done ? '[x]' : '[ ]') + ' ')
    state.renderContent(node)
  },
}, {
  ...defaultMarkdownSerializer.marks,
})
