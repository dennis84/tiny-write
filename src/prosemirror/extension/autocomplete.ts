import {keymap} from 'prosemirror-keymap'
import {Plugin, PluginKey} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

const MAX_MATCH = 500

const pluginKey = new PluginKey('autocomplete')

class AutocompleteView {
  private dialog: HTMLElement

  constructor(private view: EditorView) {
    this.dialog = document.createElement('div')
    this.dialog.className = 'autocomplete'
    view.dom.parentNode.appendChild(this.dialog)
    this.update(view)
  }

  update(view) {
    const pluginState = pluginKey.getState(view.state)
    this.dialog.innerHTML = ''
    let coords
    if (!pluginState?.options?.length) return
    try {
      coords = view.coordsAtPos(pluginState.from + 1)
    } catch (e) {
      // return if fail to find coords. can happen if e.g. an input rule
      // tranforms the text before the view update.
      return
    }

    this.dialog.style.left = `${coords.left}px`
    this.dialog.style.top = `${coords.bottom + 10}px`

    pluginState.options.forEach((f, i) => {
      const option = document.createElement('div')
      if (i === pluginState.selected) {
        option.classList.add('selected')
      }

      option.textContent = f
      this.dialog.appendChild(option)
    });
  }

  destroy() {
    this.dialog.remove()
  }
}

export const completionPlugin = (regex, getOptions) => new Plugin({
  key: pluginKey,
  state: {
    init() {
      return {}
    },
    apply(tr, prev) {
      const meta = tr.getMeta(this)
      if (!meta) return prev
      return meta
    }
  },
  view(editorView) {
    return new AutocompleteView(editorView)
  },
  props: {
    handleTextInput(view, from, to, t) {
      if (view.composing) return false
      const state = view.state
      const $from = state.doc.resolve(from)
      if ($from.parent.type.spec.code) return false

      const text = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - MAX_MATCH),
        $from.parentOffset,
        null,
        '\ufffc'
      ) + t + $from.parent.textBetween(
        $from.parentOffset,
        $from.node().nodeSize - 2,
        null,
        '\ufffc'
      )

      const matches = text.matchAll(regex)
      for (const match of matches) {
        const matchFrom = $from.before() + match.index
        const matchTo = matchFrom + match[0].length

        if (from >= matchFrom && to <= matchTo) {
          getOptions(match[0], view.state).then((options) => {
            const tr = view.state.tr
            view.dispatch(tr.setMeta(pluginKey, {
              from: matchFrom,
              to: matchTo,
              text: match[0],
              options,
              selected: options.length > 0 ? 0 : -1,
            }))
          })

          return false
        }
      }

      const pluginState = pluginKey.getState(state)
      if (pluginState.from) {
        view.dispatch(state.tr.setMeta(pluginKey, {}))
      }

      return false
    },
  }
})

export const completionKeymap = keymap({
  ArrowLeft: (state, dispatch) => {
    dispatch(state.tr.setMeta(pluginKey, {}))
    return false
  },
  ArrowRight: (state, dispatch) => {
    dispatch(state.tr.setMeta(pluginKey, {}))
    return false
  },
  ArrowDown: (state, dispatch) => {
    const pluginState = pluginKey.getState(state)
    if (!pluginState?.options?.length) return false
    const selected =
      pluginState.selected === undefined ? 0 :
      pluginState.selected >= pluginState.options.length - 1 ? 0 :
      pluginState.selected + 1
    dispatch(state.tr.setMeta(pluginKey, {...pluginState, selected}))
    return true
  },
  ArrowUp: (state, dispatch) => {
    const pluginState = pluginKey.getState(state)
    if (!pluginState?.options?.length) return false
    const selected =
      pluginState.selected === undefined ? pluginState.options.length - 1 :
      pluginState.selected <= 0 ? pluginState.options.length - 1 :
      pluginState.selected - 1
    dispatch(state.tr.setMeta(pluginKey, {...pluginState, selected}))
    return true
  },
  Backspace: (state, dispatch) => {
    dispatch(state.tr.setMeta(pluginKey, {}))
    return false
  },
  Enter: (state, dispatch) => {
    const pluginState = pluginKey.getState(state)
    if (!pluginState?.options?.length) return false

    const tr = state.tr
    tr.replaceWith(
      pluginState.from + 1,
      pluginState.to + 1,
      state.schema.text(pluginState.options[pluginState.selected])
    )
    tr.setMeta(pluginKey, {})
    dispatch(tr)
    return true
  },
})
