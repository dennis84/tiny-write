import {syntaxTree} from '@codemirror/language'
import {
  CompletionSource,
  currentCompletions,
  acceptCompletion,
  moveCompletionSelection,
} from '@codemirror/autocomplete'

let line
let options

const findWords: CompletionSource = (context) => {
  const tree = syntaxTree(context.state)
  const cur = tree.resolve(context.pos, -1)

  if (line === context.state.doc.lines) {
    return {from: cur.from, options}
  }

  line = context.state.doc.lines
  const words = []
  const c = tree.cursor()

  do {
    if (c.to >= context.pos) {
      continue
    }

    if (!c.node.firstChild) {
      let text = context.state.sliceDoc(c.node.from, c.node.to)
      if (c.node.type.name === 'String') {
        text = text.substring(1, text.length - 1)
      }

      if (!text.match(/[\w\d]+/)) {
        continue
      }

      const xs = text.split(/[\s,-]+/).filter(x => x.length > 2)
      words.push(...xs)
    }
  } while (c.next())

  options = words.map((label) => ({
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
  run: (editorView) => {
    const completions = currentCompletions(editorView.state)
    if (completions.length === 1) {
      acceptCompletion(editorView)
    } else {
      moveCompletionSelection(true)(editorView)
    }

    return true
  }
}]
