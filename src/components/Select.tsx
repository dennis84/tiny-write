import {Show, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Box2d} from '@tldraw/primitives'
import {DragGesture} from '@use-gesture/vanilla'
import {CornerType, Mode, useState} from '@/state'

const SelectionFrame = styled('div')`
  position: absolute;
  background: var(--selection);
  z-index: 99999;
`

interface Props {
  target: () => HTMLElement;
}

export default (props: Props) => {
  const [state, ctrl] = useState()
  const [frame, setFrame] = createSignal<Box2d>()

  onMount(() => {
    const target = props.target()
    if (!target) return

    const gesture = new DragGesture(target, ({event, first, last, initial: [x, y], movement: [mx, my], memo}) => {
      // Prefer normal text selection
      if ((event.target as HTMLElement).closest('.ProseMirror')) {
        return
      }

      // If only clicked
      if (!first && !memo) {
        if (state.mode === Mode.Canvas) {
          ctrl.canvas.deselect()
        } else {
          ctrl.editor.deselect()
        }
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const initial: Box2d = first ? new Box2d(x, y, 0, 0): memo
      const newBox = Box2d.Resize(initial, CornerType.TopLeft, mx, my).box

      if (state.mode === Mode.Canvas) {
        ctrl.canvas.selectBox(newBox, first, last)
      } else {
        ctrl.editor.selectBox(newBox, first, last)
      }

      ctrl.app.setSelecting(true)
      setFrame(newBox)
      if (last) {
        setFrame(undefined)
        setTimeout(() => ctrl.app.setSelecting(false), 100)
      }
      return initial
    }, {
      delay: 100,
      pointer: {keys: false},
      filterTaps: true,
      eventOptions: {passive: false},
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return <>
    <Show when={frame()}>
      {(f) =>
        <SelectionFrame
          style={{
            top: `${f().y.toString()}px`,
            left: `${f().x.toString()}px`,
            width: `${f().w.toString()}px`,
            height: `${f().h.toString()}px`,
            'border-width': '1px',
          }}
        />
      }
    </Show>
  </>
}
