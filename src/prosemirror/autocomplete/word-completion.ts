import type {Node} from 'prosemirror-model'
import {Plugin, PluginKey} from 'prosemirror-state'
import {throttle} from 'throttle-debounce'
import {completionPlugin, completionKeymap} from './autocomplete'

const pattern =
  /[a-zA-Z0-9_\u0392-\u03c9\u00c0-\u00ff\u0600-\u06ff\u0400-\u04ff]+|[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g

const getWords = (node: Node) => {
  if (node.type.name === 'code_block') return []
  const text = node.textBetween(0, node.nodeSize - 2, ' ')
  const words = (text.match(pattern) ?? []).filter((w) => w.length >= 5)
  return words
}

const collectWordsKey = new PluginKey('collect-words')
const collectWords = new Plugin({
  key: collectWordsKey,
  state: {
    init() {
      return new Set()
    },
    apply(tr, prev, _, state) {
      const meta = tr.getMeta(collectWordsKey)
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
      void update(view)
      return false
    },
  },
})

const update = throttle(500, (view) => {
  const words = new Set()
  view.state.doc.forEach((node: Node) => {
    getWords(node).forEach((w) => words.add(w))
  })

  const tr = view.state.tr
  tr.setMeta(collectWordsKey, {words})
  view.dispatch(tr)
})

export const wordCompletionPluginKey = new PluginKey('word-completion')

export const wordCompletionKeymap = completionKeymap(wordCompletionPluginKey)

export const createWordCompletionPlugins = [
  completionPlugin(wordCompletionPluginKey, /(?:^|\s)[\w]*/g, async (text, state) => {
    const words = collectWordsKey.getState(state)
    if (text.length < 1) return []
    return [...words].filter((w) => w !== text && w.startsWith(text))
  }),
  collectWords,
]
