import {
  acceptCompletion,
  currentCompletions,
  moveCompletionSelection,
} from '@codemirror/autocomplete'
import type {EditorView} from '@codemirror/view'

export const tabCompletionKeymap = [
  {
    key: 'Tab',
    run: (editorView: EditorView) => {
      const completions = currentCompletions(editorView.state)
      if (completions.length === 0) {
        return false
      } else if (completions.length === 1) {
        acceptCompletion(editorView)
      } else {
        moveCompletionSelection(true)(editorView)
      }

      return true
    },
  },
]
