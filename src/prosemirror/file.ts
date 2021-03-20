import {Plugin} from 'prosemirror-state'
import {fileExists, readFile} from '../remote'
import {isElectron} from '../env'

const REGEX = /^!\[([^[\]]*?)\]\((.+?)\)/
const MAX_MATCH = 500

const isImage = (data) =>
  data.ext === 'png' ||
  data.ext === 'jpg' ||
  data.ext === 'gif'

const imageSrc = (data) => {
  let binary = '';
  for (let i = 0; i < data.buffer.byteLength; i++) {
    binary += String.fromCharCode(data.buffer[i])
  }
  const base64 = window.btoa(binary)
  return `data:${data.mime};base64,${base64}`
}

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
          fileExists(src).then((result) => {
            if (!result) throw new Error('File does not exists')
            return readFile(src)
          }).then((data) => {
            if (data === undefined) return false
            const node = isImage(data) ?
              schema.node('image', {src: imageSrc(data), title, path: src}) :
              schema.node('code_block', {params: {file: data.file, src, title}})
            console.log(node)

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

const imageSchema = {
  inline: true,
  attrs: {
    src: {},
    alt: {default: null},
    title: {default: null},
    path: {default: null},
  },
  group: 'inline',
  draggable: true,
  parseDOM: [{tag: 'img[src]', getAttrs: (dom) => ({
    src: dom.getAttribute('src'),
    title: dom.getAttribute('title'),
    alt: dom.getAttribute('alt'),
    path: dom.getAttribute('data-path'),
  })}],
  toDOM: (node) => ['img', {
    src: node.attrs.src,
    title: node.attrs.title,
    alt: node.attrs.alt,
    'data-path': node.attrs.path,
  }]
}

const dropFile = (schema) => new Plugin({
  props: {
    handleDOMEvents: {
      drop: (view, event) => {
        const {files} = event.dataTransfer

        if (files.length === 0) return
        event.preventDefault()

        const insertImage = (src) => {
          const tr = view.state.tr
          const node = schema.nodes.image.create({src})
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          }).pos

          tr.insert(pos, node)
          view.dispatch(tr)
        }

        if (files && files.length > 0) {
          for (const file of files) {
            const reader = new FileReader()
            const [mime] = file.type.split('/')

            if (mime === 'image') {
              reader.addEventListener('load', () => {
                const url = reader.result
                insertImage(url)
              })

              reader.readAsDataURL(file)
            }
          }
        }
      }
    }
  }
})

export default ({
  schema: (prev) => ({
    ...prev,
    nodes: prev.nodes.update('image', imageSchema),
  }),
  plugins: (prev, schema) => [
    ...prev,
    dropFile(schema),
    ...(isElectron ? [fileInput(schema)] : []),
  ]
})
