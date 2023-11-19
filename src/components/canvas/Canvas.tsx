import {createSignal, For, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Gesture} from '@use-gesture/vanilla'
import {Vec2d} from '@tldraw/primitives'
import {isEditorElement, isLinkElement, isImageElement, useState, isVideoElement} from '@/state'
import Grid from './Grid'
import Editor from './Editor'
import Link from './Link'
import Image from './Image'
import Video from './Video'
import LinkEnd from './LinkEnd'
import Bounds from './Bounds'

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
  user-select: none;
  -webkit-user-select: none;
`

export default () => {
  const [, ctrl] = useState()
  const [stopGesture, setStopGesture] = createSignal(false)
  const scaleBounds = {min: 0.3, max: 10}
  let ref!: HTMLDivElement

  const onGridClick = () => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    ctrl.canvas.deselect()
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
    ctrl.canvas.canvasRef = ref
    const preventGesture = (e: TouchEvent) => e.preventDefault()
    // @ts-ignore
    document.addEventListener('gesturestart', preventGesture)
    // @ts-ignore
    document.addEventListener('gesturechange', preventGesture)
    // @ts-ignore
    document.addEventListener('gestureend', preventGesture)

    const gesture = new Gesture(ref, {
      onPinch: ({origin: [ox, oy], offset: [s]}) => {
        zoomTo(s, [ox, oy])
      },
      onWheel: ({event, first, last, pinching, offset: [x, y]}) => {
        if (pinching) return false
        const skip = stopGesture()
        if (last) setStopGesture(false)
        if (skip) return false

        const target = event.target as HTMLElement
        if (first && target.closest('.ProseMirror')) {
          setStopGesture(true)
          return false
        }

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
    })
  })

  return (
    <Container ref={ref} data-testid="canvas_container">
      <LinkEnd />
      <Grid onClick={onGridClick} />
      <Board
        style={{
          transform: `
            scale(${ctrl.canvas.currentCanvas?.camera.zoom})
            translateX(${ctrl.canvas.currentCanvas?.camera.point[0]}px)
            translateY(${ctrl.canvas.currentCanvas?.camera.point[1]}px)
          `
        }}
      >
        <Show when={ctrl.canvas.selection}>
          {(sel) =>
            <Bounds
              selection={sel()}
              selected={true}
              visible={true}
              index={99999}
            />
          }
        </Show>
        <For each={ctrl.canvas.currentCanvas?.elements}>
          {(element, index) =>
            isEditorElement(element) ? <Editor element={element} index={index()} /> :
            isLinkElement(element) ? <Link element={element} /> :
            isImageElement(element) ? <Image element={element} index={index()} /> :
            isVideoElement(element) ? <Video element={element} index={index()} /> :
            null
          }
        </For>
      </Board>
    </Container>
  )
}
