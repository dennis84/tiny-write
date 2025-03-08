import {KeyBinding} from '@codemirror/view'

export const onEnterDoubleNewline = (fn: () => void): KeyBinding => ({
  key: 'Enter',
  run: (editorView) => {
    const state = editorView.state
    const selection = state.selection
    const from = selection.main.head - 2
    const to = selection.main.head

    const isEnd = to === state.doc.length
    const isNewLine = state.sliceDoc(from, to) === '\n\n'

    if (isEnd && isNewLine) {
      editorView.dispatch({changes: {from, to}})
      fn()
      return true
    }

    return false
  },
})
