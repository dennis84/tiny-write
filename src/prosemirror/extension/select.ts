import {Plugin, TextSelection} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

interface Props {
  background: string;
}

interface Coords {
  fromX: number;
  fromY: number;
  toX?: number;
  toY?: number;
}

interface Position {
  top: number;
  bottom: number;
  left: number;
  right: number;
  pos: number;
  nodeSize: number;
}

const resolvePos = (view: EditorView, pos: number) => {
  try {
    return view.state.doc.resolve(pos)
  } catch (err) {
    // ignore
  }
}

class SelectView {
  view: EditorView
  props: Props
  coords: Coords
  positions: Position[] = []
  selection: HTMLElement
  canvas: HTMLCanvasElement

  onMouseDown = (e) => {
    this.onMouseUp()
    if (this.closest(e.target, this.view.dom)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.canvas.style.position='absolute'
    this.canvas.style.left = '0'
    this.canvas.style.top = '0'
    this.canvas.style.zIndex = '100000'
    this.canvas.style.pointerEvents = 'none'
    document.body.appendChild(this.canvas)

    this.view.state.doc.forEach((node, offset) => {
      this.positions.push({
        ...this.view.coordsAtPos(offset + 1),
        pos: offset,
        nodeSize: node.nodeSize,
      })
    })

    this.coords = {fromX: e.pageX, fromY: e.pageY}
    const pos = this.view.posAtCoords({left: e.pageX, top: e.pageY})?.pos ?? 0
    const sel = TextSelection.create(this.view.state.doc, pos)
    const tr = this.view.state.tr
    tr.setSelection(sel)
    this.view.dispatch(tr)
    this.view.focus()
    document.body.appendChild(this.canvas)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  onMouseMove = (e) => {
    this.coords.toX = e.pageX
    this.coords.toY = e.pageY
    const context = this.canvas.getContext('2d')
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    context.fillStyle = this.props.background
    context.fillRect(
      this.coords.fromX,
      this.coords.fromY,
      this.coords.toX - this.coords.fromX,
      this.coords.toY - this.coords.fromY
    )

    this.select()
  }

  onMouseUp = () => {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
    if (this.canvas) document.body.removeChild(this.canvas)
    this.canvas = undefined
    this.coords = undefined
  }

  constructor(view: EditorView, props: Props) {
    this.view = view
    this.props = props
    document.addEventListener('mousedown', this.onMouseDown)
  }

  destroy() {
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  select() {
    if (!this.coords?.toX || !this.coords?.toY) return
    const scrollTop = (this.view.dom.parentNode as HTMLElement).scrollTop
    const fromY = Math.min(this.coords.fromY, this.coords.toY) + scrollTop
    const toY = Math.max(this.coords.fromY, this.coords.toY) + scrollTop

    let min = -1
    let max = -1
    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i]
      const nextPos = this.positions[i+1]
      const posBottom = Math.max(pos.bottom, nextPos?.top ?? pos.bottom)

      if (
        (fromY < pos.top || fromY < posBottom) &&
        (toY > pos.top || toY > posBottom)
      ) {
        if (pos.pos < min || min === -1) min = pos.pos
        if (pos.pos > min || max === -1) max = pos.pos + pos.nodeSize
      }
    }

    if (min === -1 || max === -1) {
      const pos = this.view.posAtCoords({left: this.coords.fromX, top: this.coords.fromY})?.pos ?? 0
      const sel = TextSelection.create(this.view.state.doc, pos)
      const tr = this.view.state.tr
      tr.setSelection(sel)
      this.view.dispatch(tr)
      return
    }

    const from = resolvePos(this.view, min)
    const to = resolvePos(this.view, max)
    const sel = TextSelection.between(from, to)
    const tr = this.view.state.tr
    tr.setSelection(sel)
    this.view.dispatch(tr)
  }

  closest(elem, other) {
    let parent = elem.parentElement
    while (parent) {
      if (parent === other) {
        return parent
      }

      parent = parent.parentElement
    }
  }
}

const select = (props: Props) => new Plugin({
  view(editorView) {
    return new SelectView(editorView, props)
  }
})

export default (props: Props) => ({
  plugins: (prev) => [...prev, select(props)]
})
