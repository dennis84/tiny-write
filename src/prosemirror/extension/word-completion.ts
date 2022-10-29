import {Plugin, PluginKey} from 'prosemirror-state'
import {debounce} from 'ts-debounce'
import {ProseMirrorExtension} from '../state'
import {completionPlugin, completionKeymap} from './autocomplete'

const getWords = (text) => {
  const results = text.match(/("[^"]+"|[^"\s]+)/g)
  if (!results) return []
  return results
    .map((w) => w.replace(/^[^\w]*|[^\w]$/g, ''))
    .filter((w) => w.length >= 5)
}

const pluginKey = new PluginKey('word-complete')
const plugin = new Plugin({
  key: pluginKey,
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
          if (node.type.name === 'code_block') return
          getWords(node.textContent).forEach((w) => prev.add(w))
        })
      }

      return prev
    },
  },
  props: {
    handleTextInput(view, from, to) {
      // const $from = view.state.doc.resolve(from)
      update(view, from, to)
      return false
    }
  }
})

const update = debounce((view, from, to) => {
  const words = new Set()
  view.state.doc.descendants((node, pos) => {
    console.log(node, {pos, from, to})
    // if (node.type.name === 'code_block') return
    // getWords(node.textContent).forEach((w) => words.add(w))
  })

  const tr = view.state.tr
  tr.setMeta(pluginKey, {words})
  view.dispatch(tr)
}, 500)

export default (): ProseMirrorExtension => ({
  plugins: (prev) => [
    completionKeymap,
    ...prev,
    completionPlugin(/[\w]*/g, async (text, state) => {
      const words = pluginKey.getState(state)
      if (text.length < 1) return []
      return [...words].filter((w) => w.startsWith(text))
    }),
    plugin,
  ]
})
