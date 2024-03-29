import {Node} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {DragGesture} from '@use-gesture/vanilla'
import {isMac, isTauri} from '@/env'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'
import {Mode} from '@/state'
import * as remote from '@/remote'

export enum Align {
  FloatLeft = 'float-left',
  FloatRight = 'float-right',
  Center = 'center',
}

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
    align: {default: Align.FloatLeft}
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
    align: {default: Align.FloatLeft}
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
  width!: number
  align!: string
  resize?: DragGesture

  constructor(
    node: Node,
    private view: EditorView,
    private getPos: () => number | undefined,
    private ctrl: Ctrl,
  ) {
    this.container = document.createElement('span')
    this.width = node.attrs.width ?? 0
    this.align = node.attrs.align
    this.container.classList.add('image-container', this.align)

    // Videos in tauri on mac does not work at the moment
    let source: HTMLImageElement | HTMLSourceElement
    if (node.type.name === 'video' && !(isTauri() && isMac)) {
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
      remote.error(`Could not load media (type=${node.type.name})`)
      this.container.classList.add('error')
    }

    if (
      isTauri() &&
      !node.attrs.src.startsWith('asset:') &&
      !node.attrs.src.startsWith('data:') &&
      !isUrl(node.attrs.src)
    ) {
      ctrl.image.getImagePath(node.attrs.src, this.ctrl?.file?.currentFile?.path).then((p) => {
        this.container.classList.remove('error')
        source.setAttribute('src', p)
      })
    } else {
      source.setAttribute('src', node.attrs.src)
    }

    this.handle = document.createElement('span')
    this.handle.className = 'resize-handle'

    this.resize = new DragGesture(this.handle, ({event, first, last, memo, movement: [mx]}) => {
      event.preventDefault()
      if (first) {
        let w = this.container.getBoundingClientRect().width
        if (ctrl.app.mode === Mode.Canvas) {
          const zoom = ctrl.canvas.currentCanvas?.camera.zoom ?? 1
          w /= zoom
        }

        memo = w
      }

      this.width = memo + (this.align === Align.FloatRight ? -mx : mx)
      this.setWidth(this.width)

      if (last) {
        const tr = this.view.state.tr
        const nodePos = this.getPos()
        if (nodePos === undefined) return
        // Only string attributes are cloned in yjs
        tr.setNodeAttribute(nodePos, 'width', String(this.width))
        this.view.dispatch(tr)
      }
      return memo
    }, {eventOptions: {passive: false}})

    this.container.appendChild(this.handle)
    this.dom = this.container
    this.update(node)
  }

  update(node: Node) {
    if (node.attrs.width) this.setWidth(Number(node.attrs.width))

    if (node.attrs.align !== this.align) {
      this.container.classList.remove(this.align)
      this.container.classList.add(node.attrs.align)
      this.align = node.attrs.align
    }

    // Don't reinitialize view
    return true
  }

  destroy() {
    this.resize?.destroy()
  }

  private setWidth(width: number) {
    this.container.style.width = width + 'px'
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
