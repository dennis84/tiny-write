import {createEffect, createSignal, For, onCleanup, onMount, Show} from 'solid-js'
import {File, useState} from '@/state'
import {wordCompletionPluginKey} from '@/prosemirror/autocomplete/word-completion'
import {ReferenceElement} from '@floating-ui/dom'
import {CompletionState} from '@/prosemirror/autocomplete/autocomplete'
import {EditorView} from 'prosemirror-view'
import {fileListingPluginKey} from '@/prosemirror/autocomplete/file-listing'
import {Tooltip} from '../Tooltip'

interface Props {
  file?: File
}

export const AutocompleteTooltip = (props: Props) => {
  const [store, ctrl] = useState()
  const [completion, setCompletion] = createSignal<CompletionState>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<ReferenceElement | undefined>()

  const getCompletionState = (editorView: EditorView): CompletionState | undefined => {
    const fl = fileListingPluginKey.getState(editorView.state)
    if (fl?.options?.length) return fl
    const wc = wordCompletionPluginKey.getState(editorView.state)
    if (wc?.options?.length) return wc
  }

  const calcPosition = (c: CompletionState) => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const coords = editorView.coordsAtPos(c.from + 1)
    const virtualEl = {
      getBoundingClientRect() {
        return {
          x: coords.left,
          y: coords.top,
          top: coords.bottom,
          left: coords.left,
          bottom: coords.bottom,
          right: coords.right,
          width: 1,
          height: 1,
        }
      },
    }

    setTooltipAnchor(virtualEl)
  }

  const onWheel = () => {
    const c = completion()
    if (!c) return
    calcPosition(c)
  }

  createEffect(() => {
    if (!store.lastTr) return
    const editorView = props.file?.editorView
    if (!editorView) return
    const sel = editorView.state.selection
    if (!sel.empty) return

    const cs = getCompletionState(editorView)

    if (cs && cs.from && cs.to && sel.from - 1 >= cs.from && sel.from - 1 <= cs.to) {
      setCompletion(cs)
    } else {
      setCompletion(undefined)
    }
  })

  createEffect(() => {
    const c = completion()
    if (!c) return
    calcPosition(c)
  })

  onMount(() => {
    window.addEventListener('wheel', onWheel)

    onCleanup(() => {
      window.removeEventListener('wheel', onWheel)
    })
  })

  return (
    <Show when={tooltipAnchor() !== undefined && completion()?.options.length}>
      <Tooltip anchor={tooltipAnchor()!} placement="bottom-start">
        <For each={completion()?.options}>
          {(option, i) => (
            <div class={i() === completion()?.selected ? 'selected' : ''}>{option}</div>
          )}
        </For>
      </Tooltip>
    </Show>
  )
}
