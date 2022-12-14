import {Node} from 'prosemirror-model'
import {Plugin, PluginKey} from 'prosemirror-state'
import {debounce} from 'ts-debounce'
import {ProseMirrorExtension} from '@/prosemirror/state'
import {completionPlugin, completionKeymap} from './autocomplete'

const getWords = (node: Node) => {
  if (node.type.name === 'code_block') return []
  const text = node.textBetween(0, node.nodeSize - 2, ' ')
  const results = text.match(/("[^"]+"|[^"\s]+)/g)
  if (!results) return []
  return results
    .map((w) => w.replace(/^[^\w]*|[^\w]$/g, ''))
    .filter((w) => w.length >= 5)
}

const collectWordsKey = new PluginKey('collect-words')
const plugin = new Plugin({
  key: collectWordsKey,
  state: {
    init() {
      return new Set()
    },
    apply(tr, prev, _, state) {
      const meta = tr.getMeta(this)
      if (meta?.words) return meta.words
      // Generate words initially
      if (prev.size === 0) {
        state.doc.forEach((node) => {
          getWords(node).forEach((w) => prev.add(w))
        })
      }

      return prev
    },
  },
  props: {
    handleTextInput(view) {
      update(view)
      return false
    }
  }
})

const update = debounce((view) => {
  const words = new Set()
  view.state.doc.forEach((node) => {
    getWords(node).forEach((w) => words.add(w))
  })

  const tr = view.state.tr
  tr.setMeta(collectWordsKey, {words})
  view.dispatch(tr)
}, 500)

const wordCompletionKey = new PluginKey('word-completion')

export default (fontSize): ProseMirrorExtension => ({
  plugins: (prev) => [
    completionKeymap(wordCompletionKey),
    ...prev,
    completionPlugin(
      wordCompletionKey,
      /[\w]*/g,
      async (text, state) => {
        const words = collectWordsKey.getState(state)
        if (text.length < 1) return []
        return [...words].filter((w) => w !== text && w.startsWith(text))
      },
      fontSize
    ),
    plugin,
  ]
})
