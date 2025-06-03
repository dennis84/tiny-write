import {keymap} from 'prosemirror-keymap'
import {type EditorState, Plugin, type PluginKey, type Transaction} from 'prosemirror-state'

const MAX_MATCH = 500

export interface CompletionState {
  from: number
  to: number
  text: string
  options: string[]
  selected: number
}

type GetOptions = (match: string, state: EditorState) => Promise<string[]>

export const completionPlugin = (pluginKey: PluginKey, regex: RegExp, getOptions: GetOptions) =>
  new Plugin({
    key: pluginKey,
    state: {
      init() {
        return {}
      },
      apply(tr, prev) {
        const meta = tr.getMeta(pluginKey)
        if (!meta) return prev
        return meta
      },
    },
    props: {
      handleDOMEvents: {
        blur: (view) => maybeClose(pluginKey, view.state, view.dispatch),
      },
      handleTextInput(view, from, to, t) {
        if (view.composing) return false
        const state = view.state
        const $from = state.doc.resolve(from)
        if ($from.depth === 0) return false
        if ($from.parent.type.spec.code) return false

        const text =
          $from.parent.textBetween(
            Math.max(0, $from.parentOffset - MAX_MATCH),
            $from.parentOffset,
            null,
            '\ufffc',
          ) +
          t +
          $from.parent.textBetween($from.parentOffset, $from.node().nodeSize - 2, null, '\ufffc')

        const matches = text.matchAll(regex)
        for (const match of matches) {
          const startSpaces = match[0].search(/\S/)
          const matchedText = match[0]
          const matchFrom = $from.before() + (match.index ?? 0)
          const matchTo = matchFrom + matchedText.length

          if (from >= matchFrom && to <= matchTo) {
            void getOptions(matchedText.substring(startSpaces), view.state).then((options) => {
              const tr = view.state.tr
              view.dispatch(
                tr.setMeta(pluginKey, {
                  from: matchFrom + startSpaces,
                  to: matchTo,
                  text: matchedText,
                  options,
                  selected: options.length > 0 ? 0 : -1,
                }),
              )
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
    },
  })

const maybeClose = (
  pluginKey: PluginKey,
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
) => {
  if (!dispatch) return
  const pluginState = pluginKey.getState(state)
  if (pluginState?.options?.length) {
    dispatch(state.tr.setMeta(pluginKey, {}))
  }
}

export const completionKeymap = (pluginKey: PluginKey) =>
  keymap({
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
        pluginState.selected === undefined
          ? 0
          : pluginState.selected >= pluginState.options.length - 1
            ? 0
            : pluginState.selected + 1
      dispatch?.(state.tr.setMeta(pluginKey, {...pluginState, selected}))
      return true
    },
    ArrowUp: (state, dispatch) => {
      const pluginState = pluginKey.getState(state)
      if (!pluginState?.options?.length) return false
      const selected =
        pluginState.selected === undefined
          ? pluginState.options.length - 1
          : pluginState.selected <= 0
            ? pluginState.options.length - 1
            : pluginState.selected - 1
      dispatch?.(state.tr.setMeta(pluginKey, {...pluginState, selected}))
      return true
    },
    Enter: (state, dispatch) => {
      const pluginState = pluginKey.getState(state)
      if (!pluginState?.options?.length) return false

      const tr = state.tr
      const option = pluginState.options[pluginState.selected]
      if (!option) return false

      const from = pluginState.from + 1
      const to = pluginState.to + 1
      const fromPos = tr.doc.resolve(from)

      tr.replaceWith(from, to, state.schema.text(option, fromPos.marks()))
      tr.setMeta(pluginKey, {})
      dispatch?.(tr)
      return true
    },
  })
