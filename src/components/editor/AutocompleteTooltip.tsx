import type {EditorView} from 'prosemirror-view'
import {createEffect, createMemo, For, onCleanup, onMount} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import type {CompletionState} from '@/prosemirror/autocomplete/autocomplete'
import {fileListingPluginKey} from '@/prosemirror/autocomplete/file-listing'
import {wordCompletionPluginKey} from '@/prosemirror/autocomplete/word-completion'
import {useState} from '@/state'
import type {File} from '@/types'
import {DialogList, TooltipButton} from '../dialog/Style'

interface Props {
  file?: File
}

export const AutocompleteTooltip = (props: Props) => {
  const {store} = useState()

  const getCompletionState = (editorView: EditorView): CompletionState | undefined => {
    const fl = fileListingPluginKey.getState(editorView.state)
    if (fl?.options?.length) return fl
    const wc = wordCompletionPluginKey.getState(editorView.state)
    if (wc?.options?.length) return wc
  }

  const calcPosition = (c: CompletionState, prev?: CompletionState) => {
    if (c.from === prev?.from && c.to === prev?.to) {
      return
    }

    const editorView = props.file?.editorView
    if (!editorView) return

    const coords = editorView.coordsAtPos(c.from + 1)
    const anchor = {
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

    showTooltip({anchor})
  }

  const onWheel = () => {
    const c = completion()
    if (!c) return
    calcPosition(c)
  }

  const completion = createMemo(() => {
    if (!store.lastTr) return
    const editorView = props.file?.editorView
    if (!editorView) return
    const sel = editorView.state.selection
    if (!sel.empty) return

    const cs = getCompletionState(editorView)

    if (cs?.from && cs.to && sel.from - 1 >= cs.from && sel.from - 1 <= cs.to) {
      return cs
    }
  })

  createEffect<CompletionState | undefined>((prev) => {
    const c = completion()
    if (!c) {
      closeTooltip()
      return
    }

    calcPosition(c, prev)
    return c
  })

  onMount(() => {
    window.addEventListener('wheel', onWheel)

    onCleanup(() => {
      window.removeEventListener('wheel', onWheel)
    })
  })

  const Tooltip = () => (
    <DialogList>
      <For each={completion()?.options}>
        {(option, i) => (
          <TooltipButton class={i() === completion()?.selected ? 'selected' : ''}>
            {option}
          </TooltipButton>
        )}
      </For>
    </DialogList>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
    placement: 'bottom-start',
  })

  return null
}
