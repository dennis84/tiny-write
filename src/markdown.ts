import {MarkdownSerializer, defaultMarkdownSerializer} from 'prosemirror-markdown'

export const markdownSerializer = new MarkdownSerializer({
  ...defaultMarkdownSerializer.nodes,
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
