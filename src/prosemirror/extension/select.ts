import {Plugin, PluginKey, Selection, TextSelection} from 'prosemirror-state'
import {Decoration, DecorationSet, EditorView} from 'prosemirror-view'

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
  coords: Coords
  positions: Position[] = []
  selection: HTMLElement
  canvas: HTMLCanvasElement

  onMouseDown = (e) => {
    if (e.which === 3) return
    this.onMouseUp()
    if (e.target !== this.view.dom && e.target !== this.view.dom.parentNode) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.canvas.style.position = 'absolute'
    this.canvas.style.userSelect = 'none'
    this.canvas.style.left = '0'
    this.canvas.style.top = '0'
    this.canvas.style.zIndex = '100000'
    this.canvas.style.pointerEvents = 'none'
    document.body.appendChild(this.canvas)

    this.view.state.doc.forEach((node, offset) => {
      const coords = this.view.coordsAtPos(offset + 1)
      this.positions.push({
        ...coords,
        pos: offset,
        nodeSize: node.nodeSize,
      })
    })

    // Set focus to prosemirror if in code_block
    if (!this.view.hasFocus()) {
      this.collapse(e.pageX, e.pageY)
      this.view.focus()
    }

    this.coords = {fromX: e.pageX, fromY: e.pageY}
    document.body.appendChild(this.canvas)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  onMouseMove = (e) => {
    e.preventDefault()
    e.stopPropagation()
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
    this.positions = []
    this.canvas = undefined
    this.coords = undefined
  }

  constructor(private view: EditorView, private props: Props) {
    document.addEventListener('mousedown', this.onMouseDown)
  }

  destroy() {
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  select() {
    if (!this.coords?.toX || !this.coords?.toY) return
    const fromY = Math.min(this.coords.fromY, this.coords.toY)
    const toY = Math.max(this.coords.fromY, this.coords.toY)

    let min = -1
    let max = -1
    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i]
      const nextPos = this.positions[i+1]
      const nextBottom = Math.max(pos.bottom, nextPos?.top ?? pos.bottom)

      if (
        (fromY < pos.top || fromY < nextBottom) &&
        (toY > pos.top || toY > nextBottom)
      ) {
        if (pos.pos < min || min === -1) min = pos.pos
        if (pos.pos + pos.nodeSize > max || max === -1) max = pos.pos + pos.nodeSize
      }
    }

    if (min === -1 || max === -1) {
      this.collapse(this.coords.fromX, this.coords.fromY)
      return
    }

    const from = resolvePos(this.view, min)
    const to = resolvePos(this.view, max)
    if (!from || !to) return
    const sel = TextSelection.between(from, to)
    const tr = this.view.state.tr
    tr.setSelection(sel)
    tr.setMeta(pluginKey, {from: from.pos, to: to.pos})
    if (!this.view.hasFocus()) this.view.focus()
    this.view.dispatch(tr)
  }

  collapse(left, top) {
    const pos = this.view.posAtCoords({left, top})?.pos ?? 0
    const sel = Selection.near(this.view.state.doc.resolve(pos))
    const tr = this.view.state.tr
    tr.setSelection(sel)
    tr.setMeta(pluginKey, {from: pos, to: pos})
    this.view.dispatch(tr)
    return
  }
}

const pluginKey = new PluginKey('select')

const select = (props: Props) => new Plugin({
  key: pluginKey,
  state: {
    init() {
      return undefined
    },
    apply(tr) {
      const selection = tr.getMeta(this)
      if (selection) {
        return selection
      }

      return undefined
    }
  },
  props: {
    decorations(state) {
      const decos = []
      const selection = pluginKey.getState(state)
      if (!selection) return
      if (selection.from === selection.to) {
        return DecorationSet.empty
      }

      state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        decos.push(Decoration.node(pos, pos + node.nodeSize, {
          class: 'selected',
        }))
      })

      return DecorationSet.create(state.doc, decos)
    }
  },
  view(editorView) {
    return new SelectView(editorView, props)
  }
})

export default (props: Props) => ({
  plugins: (prev) => [
    ...prev,
    select(props),
  ]
})
