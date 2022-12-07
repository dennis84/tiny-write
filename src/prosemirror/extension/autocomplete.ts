import {computePosition, offset} from '@floating-ui/dom'
import {keymap} from 'prosemirror-keymap'
import {Plugin, PluginKey} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

const MAX_MATCH = 500

class AutocompleteView {
  private tooltip: HTMLElement

  constructor(private view: EditorView, private pluginKey: PluginKey) {
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'autocomplete-tooltip'

    view.dom.parentNode.appendChild(this.tooltip)
    this.update(view)
  }

  update(view) {
    const pluginState = this.pluginKey.getState(view.state)
    this.tooltip.innerHTML = ''
    this.tooltip.style.display = 'none'
    const sel = view.state.selection

    if (!sel.empty) return

    const inRange = (
      pluginState.from &&
      pluginState.to &&
      sel.$head.pos - 1 >= pluginState.from &&
      sel.$head.pos - 1 <= pluginState.to
    ) === true

    let coords
    if (!pluginState?.options?.length || !inRange) return
    try {
      coords = view.coordsAtPos(pluginState.from + 1)
    } catch (e) {
      // return if fail to find coords. can happen if e.g. an input rule
      // tranforms the text before the view update.
      return
    }

    this.tooltip.style.display = 'block'
    const virtualEl = {
      getBoundingClientRect() {
        return {
          x: coords.left,
          y: coords.top,
          top: coords.top,
          left: coords.left,
          bottom: coords.bottom,
          right: coords.right,
          width: 1,
          height: 1,
        };
      },
    }

    computePosition(virtualEl, this.tooltip, {
      placement: 'bottom-start',
      middleware: [offset(30)],
    }).then(({x, y, placement}) => {
      this.tooltip.classList.add(placement)
      this.tooltip.style.left = `${x}px`
      this.tooltip.style.top = `${y}px`
    })

    pluginState.options.forEach((f, i) => {
      const option = document.createElement('div')
      if (i === pluginState.selected) {
        option.classList.add('selected')
      }

      option.textContent = f
      this.tooltip.appendChild(option)
    });
  }

  destroy() {
    this.tooltip.remove()
  }
}

export const completionPlugin = (pluginKey, regex, getOptions) => new Plugin({
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
    return new AutocompleteView(editorView, pluginKey)
  },
  props: {
    handleDOMEvents: {
      blur: (view) => maybeClose(pluginKey, view.state, view.dispatch),
    },
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
        const matchedText = match[0]
        const matchFrom = $from.before() + match.index
        const matchTo = matchFrom + matchedText.length

        if (from >= matchFrom && to <= matchTo) {
          getOptions(matchedText, view.state).then((options) => {
            const tr = view.state.tr
            view.dispatch(tr.setMeta(pluginKey, {
              from: matchFrom,
              to: matchTo,
              text: matchedText,
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

const maybeClose = (pluginKey, state, dispatch) => {
  const pluginState = pluginKey.getState(state)
  if (pluginState?.options?.length) {
    dispatch(state.tr.setMeta(pluginKey, {}))
  }
}

export const completionKeymap = (pluginKey) => keymap({
  ArrowLeft: (state, dispatch) => {
    maybeClose(pluginKey, state, dispatch)
    return false
  },
  ArrowRight: (state, dispatch) => {
    maybeClose(pluginKey, state, dispatch)
    return false
  },
  Backspace: (state, dispatch) => {
    maybeClose(pluginKey, state, dispatch)
    return false
  },
  Escape: (state, dispatch) => {
    maybeClose(pluginKey, state, dispatch)
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
