import markdownit from 'markdown-it'
import {MarkdownSerializer, MarkdownParser, defaultMarkdownSerializer} from 'prosemirror-markdown'
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

function listIsTight(tokens, i) {
  while (++i < tokens.length) {
    if (tokens[i].type != 'list_item_open') return tokens[i].hidden
  }
  return false
}

export const createMarkdownParser = (schema) =>
  new MarkdownParser(schema, markdownit('commonmark', {html: false}), {
    blockquote: {block: 'blockquote'},
    paragraph: {block: 'paragraph'},
    list_item: {block: 'list_item'},
    bullet_list: {
      block: 'bullet_list',
      getAttrs: (_, tokens, i) => ({tight: listIsTight(tokens, i)})
    },
    ordered_list: {
      block: 'ordered_list',
      getAttrs: (tok, tokens, i) => ({
        order: +tok.attrGet('start') || 1,
        tight: listIsTight(tokens, i)
      })
    },
    heading: {
      block: 'heading',
      getAttrs: tok => ({level: +tok.tag.slice(1)}),
    },
    code_block: {
      block: 'code_block',
      noCloseToken: true,
    },
    fence: {
      block: 'code_block',
      getAttrs: (tok) => ({params: {lang: tok.info}}),
      noCloseToken: true
    },
    hr: {node: 'horizontal_rule'},
    image: {
      node: 'image',
      getAttrs: tok => ({
        src: tok.attrGet('src'),
        title: tok.attrGet('title') || null,
        alt: tok.children[0] && tok.children[0].content || null
      })
    },
    hardbreak: {node: 'hard_break'},
    em: {mark: 'em'},
    strong: {mark: 'strong'},
    link: {
      mark: 'link',
      getAttrs: tok => ({
        href: tok.attrGet('href'),
        title: tok.attrGet('title') || null
      })
    },
    code_inline: {mark: 'code', noCloseToken: true}
  })
