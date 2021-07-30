import {Plugin} from 'prosemirror-state'
import {createMarkdownParser} from '../../markdown'

const pasteMarkdown = (schema) => {
  const parser = createMarkdownParser(schema)
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
