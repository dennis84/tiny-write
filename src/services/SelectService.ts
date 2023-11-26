import {EditorView} from 'prosemirror-view'
import {TextSelection} from 'prosemirror-state'
import {Box2d} from '@tldraw/primitives'

interface Position {
  top: number;
  bottom: number;
  left: number;
  right: number;
  pos: number;
  nodeSize: number;
}

export class SelectService {
  private positions: Position[] = []

  selectBox(box: Box2d, editorView: EditorView, first: boolean, last: boolean) {
    if (first) this.createPositions(editorView)
    const positions = this.positions
    let min = -1
    let max = -1

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      const nextPos = positions[i+1]
      const nextBottom = Math.max(pos.bottom, nextPos?.top ?? pos.bottom)

      if (
        (box.minY <= pos.top || box.minY < nextBottom) &&
        (box.maxY >= pos.top || box.maxY > nextBottom)
      ) {
        if (pos.pos < min || min === -1) min = pos.pos
        if (pos.pos + pos.nodeSize > max) max = pos.pos + pos.nodeSize
      }
    }

    if (last) this.positions = []

    if (min === -1 || max === -1) {
      return
    }

    const resolvePos = (pos: number) => {
      try {
        return editorView.state.doc.resolve(pos)
      } catch (err) {
        // ignore
      }
    }

    const from = resolvePos(min)
    const to = resolvePos(max)
    if (!from || !to) return
    const sel = TextSelection.between(from, to)
    const tr = editorView.state.tr
    tr.setSelection(sel)
    if (!editorView.hasFocus()) editorView.focus()
    editorView.dispatch(tr)
  }

  private createPositions(editorView: EditorView) {
    editorView.state.doc.forEach((node, offset) => {
      const coords = editorView.coordsAtPos(offset + 1)
      this.positions.push({
        ...coords,
        pos: offset,
        nodeSize: node.nodeSize,
      })
    })
  }
}
