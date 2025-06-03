import type {EditorView} from '@codemirror/view'
import {foldable, foldEffect} from '@codemirror/language'

export const foldAll = (view: EditorView) => {
  const effects = []

  for (let i = 1; i <= view.state.doc.lines; i++) {
    const from = view.state.doc.line(i).from
    const line = view.lineBlockAt(from)
    const range = foldable(view.state, line.from, line.to)
    if (range) effects.push(foldEffect.of(range))
  }

  if (effects.length) {
    view.dispatch({effects})
    return true
  }

  return false
}
