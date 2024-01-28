import {Node} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {isTauri} from '@/env'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'

const isUrl = (str: string) => {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

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
    this.container.classList.add('image-container')
    if (node.attrs.width) this.setWidth(Number(node.attrs.width))

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

    source.onerror = () => {
      this.container.classList.add('error')
    }

    if (
      isTauri() &&
      !node.attrs.src.startsWith('asset:') &&
      !node.attrs.src.startsWith('data:') &&
      !isUrl(node.attrs.src)
    ) {
      ctrl.image.getImagePath(node.attrs.src, this.ctrl?.file?.currentFile?.path).then((p) => {
        source.setAttribute('src', p)
      })
    } else {
      source.setAttribute('src', node.attrs.src)
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

  update(node: Node) {
    if (Number(node.attrs.width) !== this.width) {
      this.setWidth(Number(node.attrs.width))
    }

    // Don't reinitialize view
    return true
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
      // Only string attributes are cloned in yjs
      width: String(this.width),
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
  nodeViews: {
    image: (node, view, getPos) => {
      return new ImageView(node, view, getPos, ctrl)
    },
    video: (node, view, getPos) => {
      return new ImageView(node, view, getPos, ctrl)
    }
  },
})
