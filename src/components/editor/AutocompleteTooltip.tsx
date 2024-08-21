import {createEffect, createSignal, For, Show} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {wordCompletionPluginKey} from '@/prosemirror/autocomplete/word-completion'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {CompletionState} from '@/prosemirror/autocomplete/autocomplete'
import {EditorView} from 'prosemirror-view'
import {fileListingPluginKey} from '@/prosemirror/autocomplete/file-listing'

const TooltipEl = styled('div')`
  position: absolute;
  z-index: var(--z-index-tooltip);
`

interface Cleanup {
  fn?: () => void
}

export const AutocompleteTooltip = () => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const [store, ctrl] = useState()
  const [completion, setCompletion] = createSignal<CompletionState>()
  const cleanup = createMutable<Cleanup>({})

  const getCompletionState = (editorView: EditorView): CompletionState | undefined => {
    const fl = fileListingPluginKey.getState(editorView.state)
    if (fl?.options?.length) return fl
    const wc = wordCompletionPluginKey.getState(editorView.state)
    if (wc?.options?.length) return wc
  }

  createEffect(() => {
    if (!store.lastTr) return
    const editorView = ctrl.file.currentFile?.editorView
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
    if (!tooltipRef || !c) return
    const editorView = ctrl.file.currentFile?.editorView
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

    unwrap(cleanup).fn?.()
    cleanup.fn = autoUpdate(virtualEl, tooltipRef, async () => {
      return computePosition(virtualEl, tooltipRef, {
        placement: 'bottom-start',
        middleware: [offset(10), flip(), shift(), arrow({element: arrowRef})],
      }).then(({x, y, placement, middlewareData}) => {
        tooltipRef.style.left = `${x}px`
        tooltipRef.style.top = `${y}px`
        const side = placement.split('-')[0]
        const staticSide =
          {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right',
          }[side] ?? 'top'

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          arrowRef.classList.add(staticSide)
          Object.assign(arrowRef.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef.offsetWidth / 2}px`,
          })
        }
      })
    })
  })

  return (
    <Show when={completion()}>
      {(c) => (
        <TooltipEl ref={tooltipRef} id="autocomplete-tooltip" class="autocomplete-tooltip">
          <For each={c().options}>
            {(option, i) => <div class={i() === c().selected ? 'selected' : ''}>{option}</div>}
          </For>
          <span ref={arrowRef} class="arrow"></span>
        </TooltipEl>
      )}
    </Show>
  )
}
