import {EditorView} from '@codemirror/view'
import {syntaxTree} from '@codemirror/language'
import {
  CompletionSource,
  currentCompletions,
  acceptCompletion,
  moveCompletionSelection,
} from '@codemirror/autocomplete'

const findWords: CompletionSource = (context) => {
  const tree = syntaxTree(context.state)
  const cur = tree.resolve(context.pos, -1)

  const words = []
  const c = tree.cursor()

  do {
    if (!c.node.firstChild && (context.pos < c.from || context.pos > c.to)) {
      let text = context.state.sliceDoc(c.node.from, c.node.to)
      if (c.node.type.name === 'String') {
        text = text.substring(1, text.length - 1)
      }

      const xs = text.replace(/(?:[^\w-]|_)+/, '')
        .split(/[\s,-.]+/)
        .filter(x => x.length > 2)

      words.push(...xs)
    }
  } while (c.next())

  const options = words.map((label) => ({
    label,
    type: 'word',
    boost: 1,
  }))

  return {
    options,
    from: cur.from,
  }
}

export const completion = [findWords]

export const tabCompletionKeymap = [{
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
  }
}]
