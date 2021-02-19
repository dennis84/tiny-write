import {Plugin} from 'prosemirror-state'
import {fileExists, readFile} from '../remote'

const REGEX = /^!\[([^[\]]*?)\]\((.+?)\)/
const MAX_MATCH = 500

const isImage = (data) =>
  data.ext === 'png' ||
  data.ext === 'jpg' ||
  data.ext === 'gif'

const imageSrc = (data) =>
  `data:${data.mime};base64,${data.buffer.toString('base64')}`

const fileInput = (schema) => {
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        if (view.composing) return false
        const $from = view.state.doc.resolve(from)
        if ($from.parent.type.spec.code) return false
        const textBefore = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - MAX_MATCH),
          $from.parentOffset,
          null,
          '\ufffc'
        ) + text

        const match = REGEX.exec(textBefore)
        if (match) {
          const [,title, src] = match
          if (!fileExists(src)) {
            return false
          }

          readFile(src).then((data) => {
            if (data === undefined) return false
            const node = isImage(data) ?
              schema.node('image', {src: imageSrc(data), title}) :
              schema.node('code_block', {params: {file: data.file, src, title}})

            const start = from - (match[0].length - text.length)
            const tr = view.state.tr
            tr.delete(start, to)
            tr.insert(start, node)
            view.dispatch(tr)
          })

          return true
        }
      },
    }
  })
}

export default ({
  plugins: (prev, schema) => [
    ...prev,
    fileInput(schema),
  ]
})
