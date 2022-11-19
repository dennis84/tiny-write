import {Plugin} from 'prosemirror-state'
import {Node, Schema} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {convertFileSrc} from '@tauri-apps/api/tauri'
import {resolvePath, dirname} from '@/remote'
import {isTauri} from '@/env'
import {ProseMirrorExtension} from '@/prosemirror/state'

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

export const getImagePath = async (src: string, path?: string) => {
  const s = src.replaceAll('%20', ' ')
  const paths = path ? [await dirname(path), s] : [s]
  const absolutePath = await resolvePath(paths)
  return convertFileSrc(absolutePath)
}

const imageInput = (schema: Schema, path?: string) => new Plugin({
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

        if (!isTauri) return false

        getImagePath(src, path).then((p) => {
          const node = schema.node('image', {src: p, title, path: src})
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
  selectable: true,
  toDOM: (node: Node) => ['img', {
    src: node.attrs.src,
    title: node.attrs.title,
    alt: node.attrs.alt,
    'data-path': node.attrs.path,
  }]
}

const videoSchema = {
  inline: true,
  attrs: {
    src: {},
    type: {},
    title: {default: null},
    path: {default: null},
    width: {default: null},
  },
  group: 'inline',
  draggable: true,
  selectable: true,
  toDOM: (node: Node) => [
    'video',
    {title: node.attrs.title, 'data-path': node.attrs.path},
    ['source', {src: node.attrs.src, type: node.attrs.type}]
  ]
}

export const insertImage = (view: EditorView, src: string, left: number, top: number) => {
  const state = view.state
  const tr = state.tr
  const node = state.schema.nodes.image.create({src})
  const pos = view.posAtCoords({left, top})
  tr.insert(pos?.pos ?? state.doc.content.size, node)
  view.dispatch(tr)
}

export const insertVideo = (
  view: EditorView,
  src: string,
  type: string,
  left: number,
  top: number
) => {
  const state = view.state
  const tr = state.tr
  const node = state.schema.nodes.video.create({src, type})
  const pos = view.posAtCoords({left, top})
  tr.insert(pos?.pos ?? state.doc.content.size, node)
  view.dispatch(tr)
}

class ImageView {
  dom: Element
  contentDOM: HTMLElement
  container: HTMLElement
  handle: HTMLElement
  width: number
  updating: number

  onResize = (e: MouseEvent) => {
    this.width = e.pageX - this.container.getBoundingClientRect().left
    this.setWidth(this.width)
  }

  onResizeEnd = () => {
    window.removeEventListener('mousemove', this.onResize)
    if (this.updating === this.width) return
    this.updating = this.width
    const tr = this.view.state.tr
    tr.setNodeMarkup(this.getPos(), undefined, {
      ...this.node.attrs,
      width: this.width,
    })

    this.view.dispatch(tr)
  }

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number,
    private schema: Schema,
    private path: string
  ) {
    this.container = document.createElement('span')
    this.container.className = 'image-container'
    if (node.attrs.width) this.setWidth(node.attrs.width)

    let source
    if (node.type.name === 'video') {
      const video = document.createElement('video')
      video.setAttribute('title', node.attrs.title ?? '')
      video.setAttribute('controls', '')
      source = document.createElement('source')
      source.setAttribute('type', node.attrs.type)
      video.appendChild(source)
      this.container.appendChild(video)
    } else {
      const image = document.createElement('img')
      image.setAttribute('title', node.attrs.title ?? '')
      source = image
      this.container.appendChild(image)
    }

    if (
      isTauri &&
      !node.attrs.src.startsWith('asset:') &&
      !node.attrs.src.startsWith('data:') &&
      !isUrl(node.attrs.src)
    ) {
      getImagePath(node.attrs.src, path).then((p) => {
        source.setAttribute('src', p)
      })
    } else {
      source.setAttribute('src', node.attrs.src)
    }

    this.handle = document.createElement('span')
    this.handle.className = 'resize-handle'
    this.handle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      window.addEventListener('mousemove', this.onResize)
      window.addEventListener('mouseup', this.onResizeEnd)
    })

    this.container.appendChild(this.handle)
    this.dom = this.container
  }

  setWidth(width: number) {
    this.container.style.width = width + 'px'
  }
}

// class VideoView {
//   dom: Element
//   contentDOM: HTMLElement
//   container: HTMLElement
//   handle: HTMLElement
//   width: number
//   updating: number

//   onResize = (e: MouseEvent) => {
//     this.width = e.pageX - this.container.getBoundingClientRect().left
//     this.setWidth(this.width)
//   }

//   onResizeEnd = () => {
//     window.removeEventListener('mousemove', this.onResize)
//     if (this.updating === this.width) return
//     this.updating = this.width
//     const tr = this.view.state.tr
//     tr.setNodeMarkup(this.getPos(), undefined, {
//       ...this.node.attrs,
//       width: this.width,
//     })

//     this.view.dispatch(tr)
//   }

//   constructor(
//     private node: Node,
//     private view: EditorView,
//     private getPos: () => number,
//     private schema: Schema,
//     private path: string
//   ) {
//     this.container = document.createElement('span')
//     this.container.className = 'video-container'
//     if (node.attrs.width) this.setWidth(node.attrs.width)

//     const video = document.createElement('video')
//     video.setAttribute('title', node.attrs.title ?? '')
//     const source = document.createElement('source')
//     source.setAttribute('type', node.attrs.type)

//     if (
//       isTauri &&
//       !node.attrs.src.startsWith('asset:') &&
//       !node.attrs.src.startsWith('data:') &&
//       !isUrl(node.attrs.src)
//     ) {
//       getImagePath(node.attrs.src, path).then((p) => {
//         source.setAttribute('src', p)
//       })
//     } else {
//       source.setAttribute('src', node.attrs.src)
//     }

//     this.handle = document.createElement('span')
//     this.handle.className = 'resize-handle'
//     this.handle.addEventListener('mousedown', (e) => {
//       e.preventDefault()
//       window.addEventListener('mousemove', this.onResize)
//       window.addEventListener('mouseup', this.onResizeEnd)
//     })

//     this.container.appendChild(video)
//     this.container.appendChild(this.handle)
//     this.dom = this.container
//   }

//   setWidth(width: number) {
//     this.container.style.width = width + 'px'
//   }
// }

export default (path?: string): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any)
      .update('image', imageSchema)
      .append({video: videoSchema}),
  }),
  plugins: (prev, schema) => [
    ...prev,
    imageInput(schema, path),
  ],
  nodeViews: {
    image: (node, view, getPos) => {
      return new ImageView(node, view, getPos, view.state.schema, path)
    },
    video: (node, view, getPos) => {
      return new ImageView(node, view, getPos, view.state.schema, path)
    }
  },
})
