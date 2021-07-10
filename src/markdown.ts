import {MarkdownSerializer, defaultMarkdownSerializer} from 'prosemirror-markdown'
import {EditorState} from 'prosemirror-state'

export const serialize = (state: EditorState) => {
  let text = markdownSerializer.serialize(state.doc)
  if (text.charAt(text.length - 1) !== '\n') {
    text += '\n'
  }

  return text
}

export const markdownSerializer = new MarkdownSerializer({
  ...defaultMarkdownSerializer.nodes,
  image(state, node) {
    const alt = state.esc(node.attrs.alt || '')
    const src = node.attrs.path ?? node.attrs.src
    const title = node.attrs.title ? state.quote(node.attrs.title) : undefined
    state.write(`![${alt}](${src}${title ? (' ' + title) : ''})\n`)
  },
  code_block(state, node) {
    const src = node.attrs.params.src
    if (src) {
      const title = state.esc(node.attrs.params.title || '')
      state.write(`![${title}](${src})\n`)
      return
    }

    state.write('```' + (node.attrs.params.lang || '') + '\n')
    state.text(node.textContent, false)
    state.ensureNewLine()
    state.write('```')
    state.closeBlock(node)
  },
  todo_item(state, node) {
    state.write((node.attrs.done ? '[x]' : '[ ]') + ' ')
    state.renderContent(node)
  },
}, {
  ...defaultMarkdownSerializer.marks,
})
