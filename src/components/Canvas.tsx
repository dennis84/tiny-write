import {For, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Gesture} from '@use-gesture/vanilla'
import {Vec2d} from '@tldraw/primitives'
import {keyName} from 'w3c-keyname'
import {CanvasEditorElement, CanvasLinkElement, ElementType, useState} from '@/state'
import CanvasGrid from './CanvasGrid'
import CanvasEditor from './CanvasEditor'
import CanvasLink from './CanvasLink'

const Container = styled('div')`
  width: 100%;
  height: 100%;
  touch-action: none;
  overflow: hidden;
  position: relative;
`

const Board = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  contain: layout style size;
  width: 1px;
  height: 1px;
`

export default () => {
  const [, ctrl] = useState()
  const scaleBounds = {min: 0.5, max: 10}
  let ref!: HTMLDivElement

  const onGridClick = () => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    if (!currentCanvas.elements.find((el) => el.selected ?? false)) {
      return
    }

    ctrl.canvas.deselect()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const k = keyName(e)
    if (k === 'Backspace') {
      const currentCanvas = ctrl.canvas.currentCanvas
      if (!currentCanvas) return
      const selected = currentCanvas.elements.find((el) => el.selected && !(el as any).active)
      if (!selected) return
      ctrl.canvas.removeElement(selected.id)
    }
  }

  const zoomTo = (next: number, center?: number[]) => {
    if (!ctrl.canvas.currentCanvas?.camera) return

    let c
    if (center === undefined) {
      const {width, height} = ref.getBoundingClientRect()
      c = new Vec2d(width / 2, height / 2).toFixed()
    } else {
      c = Vec2d.FromArray(center)
    }

    const {zoom, point} = ctrl.canvas.currentCanvas.camera
    const p = Vec2d.FromArray(point)

    const p0 = c.clone().div(zoom).sub(p)
    const p1 = c.clone().div(next).sub(p)
    const [x, y] = p1.sub(p0).add(p).toFixed().toArray()
    ctrl.canvas.updateCamera({zoom: next, point: [x, y]})
  }

  onMount(() => {
    const preventGesture = (e: TouchEvent) => e.preventDefault()
    // @ts-ignore
    document.addEventListener('gesturestart', preventGesture)
    // @ts-ignore
    document.addEventListener('gesturechange', preventGesture)
    // @ts-ignore
    document.addEventListener('gestureend', preventGesture)

    document.addEventListener('keydown', onKeyDown)

    const gesture = new Gesture(ref, {
      onPinch: ({origin: [ox, oy], offset: [s]}) => {
        zoomTo(s, [ox, oy])
      },
      onWheel: ({event, pinching, offset: [x, y]}) => {
        if (pinching) return false
        event.preventDefault()
        ctrl.canvas.updateCameraPoint([-x, -y])
      },
    }, {
      target: ref,
      eventOptions: {passive: false},
      wheel: {
        from: () => [
          -(ctrl.canvas.currentCanvas?.camera.point[0] ?? 0),
          -(ctrl.canvas.currentCanvas?.camera.point[1] ?? 0),
        ],
      },
      pinch: {
        scaleBounds,
        from: () => [(ctrl.canvas.currentCanvas!.camera.zoom ?? 0), 0]
      },
    })

    onCleanup(() => {
      gesture.destroy()
      // @ts-ignore
      document.removeEventListener('gesturestart', preventGesture)
      // @ts-ignore
      document.removeEventListener('gesturechange', preventGesture)
      // @ts-ignore
      document.removeEventListener('gestureend', preventGesture)
      document.removeEventListener('keydown', onKeyDown)
    })
  })

  return (
    <Container ref={ref}>
      <CanvasGrid onClick={onGridClick} />
      <Board
        style={{
          transform: `
            scale(${ctrl.canvas.currentCanvas?.camera.zoom})
            translateX(${ctrl.canvas.currentCanvas?.camera.point[0]}px)
            translateY(${ctrl.canvas.currentCanvas?.camera.point[1]}px)
          `
        }}
      >
        <For each={ctrl.canvas.currentCanvas?.elements}>
          {(element) =>
            element.type === ElementType.Editor ? <CanvasEditor element={element as CanvasEditorElement} /> :
            element.type === ElementType.Link ? <CanvasLink element={element as CanvasLinkElement} /> :
            null
          }
        </For>
      </Board>
    </Container>
  )
}
