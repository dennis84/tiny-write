import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {foldable, foldEffect} from '@codemirror/language'

export const createFoldAllPlugin = () =>
  ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
      if (update.transactions[0]?.isUserEvent('fold_all')) {
        update.view.focus()
        setTimeout(() => foldLines(update.view))
      }
    }
  })

const foldLines = (view: EditorView) => {
  const effects = []

  for (let i = 1; i <= view.state.doc.lines; i++) {
    const from = view.state.doc.line(i).from
    const line = view.lineBlockAt(from)
    const range = foldable(view.state, line.from, line.to)
    if (range) effects.push(foldEffect.of(range))
  }

  if (effects.length) {
    view.dispatch({effects})
  }
}
