import {Show, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {Box} from '@flatten-js/core'
import {Mode, useState} from '@/state'

const SelectionFrame = styled('div')`
  position: absolute;
  background: var(--selection);
  z-index: var(--z-index-max);
`

interface Props {
  target: () => HTMLElement
}

export const Select = (props: Props) => {
  const {store, appService, canvasService, editorService} = useState()
  const [frame, setFrame] = createSignal<Box>()

  onMount(() => {
    const target = props.target()
    if (!target) return

    const gesture = new DragGesture(
      target,
      ({event, first, last, initial: [x, y], movement: [mx, my], memo}) => {
        if (
          // Prefer normal text selection
          (event.target as HTMLElement).closest('.ProseMirror') ||
          // Prefer normal text selection
          (event.target as HTMLElement).closest('.cm-editor') ||
          // Allow click on toolbar
          (event.target as HTMLElement).closest('#toolbar') ||
          // Allow click on tooltip
          (event.target as HTMLElement).closest('#tooltip') ||
          // Allow click on block-handle
          (event.target as HTMLElement).closest('#block-handle') ||
          // Allow click on table-handle
          (event.target as HTMLElement).closest('#table-handle-vert') ||
          (event.target as HTMLElement).closest('#table-handle-horiz')
        ) {
          return
        }

        // If only clicked
        if (!first && !memo) {
          if (store.mode === Mode.Canvas) {
            canvasService.deselect()
          } else {
            editorService.deselect()
          }
          return
        }

        event.preventDefault()
        event.stopPropagation()

        const initial = new Box(
          Math.min(x, x + mx),
          Math.min(y, y + my),
          Math.max(x, x + mx),
          Math.max(y, y + my),
        )

        if (store.mode === Mode.Canvas) {
          canvasService.selectBox(initial, first, last)
        } else {
          editorService.selectBox(initial, first, last)
        }

        appService.setSelecting(true)
        setFrame(initial)
        if (last) {
          setFrame(undefined)
          setTimeout(() => appService.setSelecting(false), 100)
        }
        return initial
      },
      {
        pointer: {keys: false},
        filterTaps: true,
        eventOptions: {passive: false},
      },
    )

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return (
    <>
      <Show when={frame()}>
        {(f) => (
          <SelectionFrame
            style={{
              'top': `${f().ymin.toString()}px`,
              'left': `${f().xmin.toString()}px`,
              'width': `${f().width.toString()}px`,
              'height': `${f().height.toString()}px`,
              'border-width': '1px',
            }}
          />
        )}
      </Show>
    </>
  )
}
