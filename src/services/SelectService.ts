import type {EditorView} from 'prosemirror-view'
import {TextSelection} from 'prosemirror-state'
import type {Box} from '@flatten-js/core'

interface Position {
  top: number
  bottom: number
  left: number
  right: number
  pos: number
  nodeSize: number
}

export class SelectService {
  private positions: Position[] = []

  deselect(editorView: EditorView) {
    if (editorView.state.selection.empty) return
    const tr = editorView.state.tr
    tr.setSelection(TextSelection.near(editorView.state.selection.$anchor))
    editorView.dispatch(tr)
    editorView.focus()
  }

  selectBox(box: Box, editorView: EditorView, first: boolean, last: boolean) {
    if (first) {
      this.deselect(editorView)
      this.createPositions(editorView)
    }

    const positions = this.positions
    const {ymin, ymax} = box
    let min = -1
    let max = -1

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      const nextPos = positions[i + 1]
      // use next top pos because pos.bottom is always same as pos.top
      const end = nextPos?.top ?? pos.bottom

      const surrounded = ymin <= pos.top && ymax >= end
      const touched = (ymin >= pos.top && ymin <= end) || (ymax >= pos.top && ymax <= end)

      if (touched || surrounded) {
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
      } catch (_e) {
        // ignore
      }
    }

    const from = resolvePos(min)
    const to = resolvePos(max)
    if (!from || !to) return
    const sel = new TextSelection(from, to)
    const tr = editorView.state.tr
    tr.setSelection(sel)
    editorView.dispatch(tr)
    // focus at end otherwise rm with backspace sometimes doesn't work
    if (last) editorView.focus()
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
