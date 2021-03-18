import markdownit from 'markdown-it'
import {Plugin} from 'prosemirror-state'
import {MarkdownParser} from 'prosemirror-markdown'

function listIsTight(tokens, i) {
  while (++i < tokens.length) {
    if (tokens[i].type != 'list_item_open') return tokens[i].hidden
  }
  return false
}

export const createParser = (schema) =>
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

const pasteMarkdown = (schema) => {
  const parser = createParser(schema)
  return new Plugin({
    props: {
      handlePaste: (view, event) => {
        if (!event.clipboardData) return false
        const text = event.clipboardData.getData('text/plain')
        const html = event.clipboardData.getData('text/html')

        // otherwise, if we have html then fallback to the default HTML
        // parser behavior that comes with Prosemirror.
        if (text.length === 0 || html) return false
        event.preventDefault()

        const paste = parser.parse(text)
        const slice = paste.slice(0)
        const tr = view.state.tr.replaceSelection(slice)
        view.dispatch(tr)
        return true
      }
    }
  })
}

export default ({
  plugins: (prev, schema) => [
    ...prev,
    pasteMarkdown(schema),
  ]
})
