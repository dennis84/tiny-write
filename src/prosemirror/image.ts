import {Plugin} from 'prosemirror-state'
import {Node, Schema} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {convertFileSrc} from '@tauri-apps/api/tauri'
import {resolvePath, dirname} from '@/remote'
import {isTauri} from '@/env'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'

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

const getImagePath = async (src: string, path?: string) => {
  const s = decodeURIComponent(src)
  const paths = path ? [await dirname(path), s] : [s]
  const absolutePath = await resolvePath(paths)
  return convertFileSrc(absolutePath)
}

const imageInput = (schema: Schema) => new Plugin({
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
        const node = schema.node('image', {src, title})
        const start = from - (match[0].length - text.length)
        const tr = view.state.tr
        tr.delete(start, to)
        tr.insert(start, node)
        view.dispatch(tr)

        return true
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
    width: {default: null},
  },
  group: 'inline',
  draggable: true,
  selectable: true,
  toDOM: (node: Node) => ['img', {
    src: node.attrs.src,
    title: node.attrs.title,
    alt: node.attrs.alt,
  }]
}

const videoSchema = {
  inline: true,
  attrs: {
    src: {},
    type: {},
    title: {default: null},
    width: {default: null},
  },
  group: 'inline',
  draggable: true,
  selectable: true,
  toDOM: (node: Node) => [
    'video',
    {title: node.attrs.title},
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
  contentDOM?: HTMLElement
  container: HTMLElement
  handle: HTMLElement
  width?: number

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined,
    private ctrl: Ctrl,
  ) {
    this.container = document.createElement('span')
    this.container.classList.add('image-container', 'loading')
    if (node.attrs.width) this.setWidth(node.attrs.width)

    let source: HTMLImageElement | HTMLSourceElement
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
      getImagePath(node.attrs.src, this.ctrl?.file?.currentFile?.path).then((p) => {
        source.setAttribute('src', p)
      })
    } else {
      source.setAttribute('src', node.attrs.src)
    }

    source.onload = () => {
      this.container.classList.remove('loading')
    }

    source.onerror = () => {
      this.container.classList.remove('loading')
      this.container.classList.add('error')
      this.container.appendChild(document.createTextNode('⚠︎'))
    }

    this.handle = document.createElement('span')
    this.handle.className = 'resize-handle'
    this.handle.addEventListener('mousedown', (e) => {
      if (e.buttons !== 1) return
      e.preventDefault()
      window.addEventListener('mousemove', this.onResize)
      window.addEventListener('mouseup', this.onResizeEnd)
    })

    this.container.appendChild(this.handle)
    this.dom = this.container
  }

  private setWidth(width: number) {
    this.container.style.width = width + 'px'
  }

  private onResize = (e: MouseEvent) => {
    this.width = e.pageX - this.container.getBoundingClientRect().left
    this.setWidth(this.width)
  }

  private onResizeEnd = () => {
    window.removeEventListener('mousemove', this.onResize)
    window.removeEventListener('mouseup', this.onResizeEnd)
    if (!this.width) return
    const tr = this.view.state.tr
    const nodePos = this.getPos()
    if (nodePos === undefined) return
    tr.setNodeMarkup(nodePos, undefined, {
      ...this.node.attrs,
      width: this.width,
    })

    this.view.dispatch(tr)
  }
}

export default (ctrl: Ctrl): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any)
      .update('image', imageSchema)
      .append({video: videoSchema}),
  }),
  plugins: (prev, schema) => [
    ...prev,
    imageInput(schema),
  ],
  nodeViews: {
    image: (node, view, getPos) => {
      return new ImageView(node, view, getPos, ctrl)
    },
    video: (node, view, getPos) => {
      return new ImageView(node, view, getPos, ctrl)
    }
  },
})
