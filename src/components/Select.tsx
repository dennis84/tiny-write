import {Show, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Box} from '@tldraw/editor'
import {DragGesture} from '@use-gesture/vanilla'
import {CornerType, Mode, useState} from '@/state'

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

        const initial: Box = first ? new Box(x, y, 0, 0) : memo
        const newBox = Box.Resize(initial, CornerType.TopLeft, mx, my).box

        if (store.mode === Mode.Canvas) {
          canvasService.selectBox(newBox, first, last)
        } else {
          editorService.selectBox(newBox, first, last)
        }

        appService.setSelecting(true)
        setFrame(newBox)
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
              'top': `${f().y.toString()}px`,
              'left': `${f().x.toString()}px`,
              'width': `${f().w.toString()}px`,
              'height': `${f().h.toString()}px`,
              'border-width': '1px',
            }}
          />
        )}
      </Show>
    </>
  )
}
