import {Box} from '@flatten-js/core'
import {DragGesture} from '@use-gesture/vanilla'
import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Page} from '@/types'

const SelectionFrame = styled.div`
  position: absolute;
  background: var(--selection);
  z-index: var(--z-index-max);
`

interface Props {
  target: () => HTMLElement
}

export const Select = (props: Props) => {
  const {locationService, selectService, canvasService, editorService} = useState()
  const [frame, setFrame] = createSignal<Box>()

  onMount(() => {
    const target = props.target()
    if (!target) return

    let ignoreDrag = false

    const gesture = new DragGesture(
      target,
      ({event, first, last, initial: [x, y], movement: [mx, my], memo}) => {
        if (first) {
          const pointerTarget = event.target as HTMLElement | null
          if (
            // Prefer normal text selection
            pointerTarget?.closest('.ProseMirror') ||
            // Prefer normal text selection
            pointerTarget?.closest('.cm-editor') ||
            // Allow click on toolbar
            pointerTarget?.closest('#toolbar') ||
            // Allow click on tooltip
            pointerTarget?.closest('#tooltip') ||
            // Allow click on block-handle
            pointerTarget?.closest('#block-handle') ||
            // Allow click on table-handle
            pointerTarget?.closest('#table-handle-col') ||
            pointerTarget?.closest('#table-handle-row')
          ) {
            ignoreDrag = true
          } else {
            ignoreDrag = false
          }
        }

        if (ignoreDrag) return

        // If only clicked
        if (!first && !memo) {
          if (locationService.page === Page.Canvas) {
            canvasService.deselect()
          } else {
            editorService.deselect()
          }
          return
        }

        event.preventDefault()
        event.stopPropagation()

        const boardLeft = target.getBoundingClientRect().left
        const initial = new Box(
          Math.min(x - boardLeft, x - boardLeft + mx),
          Math.min(y, y + my),
          Math.max(x - boardLeft, x - boardLeft + mx),
          Math.max(y, y + my),
        )

        if (locationService.page === Page.Canvas) {
          canvasService.selectBox(initial, first, last)
        } else {
          editorService.selectBox(initial, first, last)
        }

        selectService.selecting = true
        setFrame(initial)
        if (last) {
          setFrame(undefined)
          setTimeout(() => (selectService.selecting = false), 100)
        }
        return initial
      },
      {
        pointer: {
          keys: false,
          capture: false, // fixes PM text selection
        },
        filterTaps: true,
        eventOptions: {passive: false},
      },
    )

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return (
    <Show when={frame()}>
      {(f) => (
        <SelectionFrame
          style={{
            top: `${f().ymin.toString()}px`,
            left: `${f().xmin.toString()}px`,
            width: `${f().width.toString()}px`,
            height: `${f().height.toString()}px`,
            'border-width': '1px',
          }}
        />
      )}
    </Show>
  )
}
