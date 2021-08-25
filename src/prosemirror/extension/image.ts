import {Plugin} from 'prosemirror-state'
import {Node, Schema} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {FileInfo, isImage, readFile, resolve} from '../../remote'
import {ProseMirrorExtension} from '../state'

const REGEX = /^!\[([^[\]]*?)\]\((.+?)\)\s+/
const MAX_MATCH = 500

const isUrl = (str: string) => {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

const isBlank = (text: string) => text === ' ' || text === '\xa0'

const imageSrc = (data: FileInfo) => {
  let binary = ''
  for (let i = 0; i < data.buffer.byteLength; i++) {
    binary += String.fromCharCode(data.buffer[i])
  }
  const base64 = window.btoa(binary)
  return `data:${data.mime};base64,${base64}`
}

const imageInput = (schema: Schema) => {
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        if (view.composing || !isBlank(text)) return false
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
          if (isUrl(src)) {
            const node = schema.node('image', {src, title})
            const start = from - (match[0].length - text.length)
            const tr = view.state.tr
            tr.delete(start, to)
            tr.insert(start, node)
            view.dispatch(tr)
            return true
          }

          isImage(src).then((result) => {
            if (!result) return
            return readFile(src)
          }).then((data) => {
            if (!data) return false
            const node = schema.node('image', {src: imageSrc(data), title, path: src})
            const start = from - (match[0].length - text.length)
            const tr = view.state.tr
            tr.delete(start, to)
            tr.insert(start, node)
            view.dispatch(tr)
          })

          return false
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
    width: {default: null},
  },
  group: 'inline',
  draggable: true,
  parseDOM: [{tag: 'img[src]', getAttrs: (dom: Element) => ({
    src: dom.getAttribute('src'),
    title: dom.getAttribute('title'),
    alt: dom.getAttribute('alt'),
    path: dom.getAttribute('data-path'),
  })}],
  toDOM: (node: Node) => ['img', {
    src: node.attrs.src,
    title: node.attrs.title,
    alt: node.attrs.alt,
    'data-path': node.attrs.path,
  }]
}

const dropFile = (schema: Schema) => new Plugin({
  props: {
    handleDOMEvents: {
      drop: (view, event) => {
        const {files} = event.dataTransfer

        if (files.length === 0) return false
        event.preventDefault()

        const insertImage = (src: string) => {
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
                const url = reader.result as string
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

class ImageView {
  node: Node
  view: EditorView
  getPos: () => number
  schema: Schema
  dom: Element
  contentDOM: Element
  container: HTMLElement
  handle: HTMLElement
  onResizeFn: any
  onResizeEndFn: any
  width: number
  updating: number

  constructor(
    node: Node,
    view: EditorView,
    getPos: () => number,
    schema: Schema,
    path: string
  ) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.schema = schema
    this.onResizeFn = this.onResize.bind(this)
    this.onResizeEndFn = this.onResizeEnd.bind(this)

    this.container = document.createElement('span')
    this.container.className = 'image-container'
    if (node.attrs.width) this.setWidth(node.attrs.width)

    const image = document.createElement('img')
    image.setAttribute('src', node.attrs.src)
    image.setAttribute('title', node.attrs.title ?? '')

    if (path && !node.attrs.src.startsWith('data:')) {
      resolve(path, node.attrs.src).then((p) => {
        image.setAttribute('src', p)
      })
    }

    this.handle = document.createElement('span')
    this.handle.className = 'resize-handle'
    this.handle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      window.addEventListener('mousemove', this.onResizeFn)
      window.addEventListener('mouseup', this.onResizeEndFn)
    })

    this.container.appendChild(image)
    this.container.appendChild(this.handle)
    this.dom = this.container
  }

  onResize(e: MouseEvent) {
    this.width = e.pageX - this.container.getBoundingClientRect().left
    this.setWidth(this.width)
  }

  onResizeEnd() {
    window.removeEventListener('mousemove', this.onResizeFn)
    if (this.updating === this.width) return
    this.updating = this.width
    const tr = this.view.state.tr
    tr.setNodeMarkup(this.getPos(), undefined, {
      ...this.node.attrs,
      width: this.width,
    })

    this.view.dispatch(tr)
  }

  setWidth(width: number) {
    this.container.style.width = width + 'px'
  }
}

export default (path?: string): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: prev.nodes.update('image', imageSchema),
  }),
  plugins: (prev, schema) => [
    ...prev,
    dropFile(schema),
    imageInput(schema),
  ],
  nodeViews: {
    image: (node, view, getPos) => {
      return new ImageView(node, view, getPos, view.state.schema, path)
    }
  },
})
