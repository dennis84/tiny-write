import {For, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Gesture} from '@use-gesture/vanilla'
import {Vec} from '@tldraw/editor'
import {isEditorElement, isLinkElement, isImageElement, useState, isVideoElement} from '@/state'
import {isTauri} from '@/env'
import Grid from './Grid'
import Editor from './Editor'
import Link from './Link'
import Image from './Image'
import Video from './Video'
import LinkEnd from './LinkEnd'
import Bounds from './Bounds'
import Select from '../Select'

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

const DragArea = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  z-index: 999999;
  cursor: var(--cursor-grab);
`

export default () => {
  const [state, ctrl] = useState()

  const scaleBounds = {min: 0.3, max: 10}
  let ref!: HTMLDivElement

  const onGridClick = () => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    if (state.selecting) return
    ctrl.canvas.deselect()
  }

  const zoomTo = (next: number, center?: number[]) => {
    if (!ctrl.canvas.currentCanvas?.camera) return

    let c
    if (center === undefined) {
      const {width, height} = ref.getBoundingClientRect()
      c = new Vec(width / 2, height / 2).toFixed()
    } else {
      c = Vec.FromArray(center)
    }

    const {zoom, point} = ctrl.canvas.currentCanvas.camera
    const p = Vec.FromArray(point)

    const p0 = c.clone().div(zoom).sub(p)
    const p1 = c.clone().div(next).sub(p)
    const [x, y] = p1.sub(p0).add(p).toFixed().toArray()
    ctrl.canvas.updateCamera({zoom: next, point: [x, y]})
  }

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

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
      onWheel: ({event, pinching, delta: [dx, dy]}) => {
        if (pinching) return false

        const target = event.target as HTMLElement
        if (target.closest('.ProseMirror')) {
          return false
        }

        const {zoom, point: [x, y]} = currentCanvas.camera
        ctrl.canvas.updateCameraPoint([x - dx / zoom , y - dy / zoom])
      },
    }, {
      target: ref,
      eventOptions: {passive: false},
      drag: {delay: true, threshold: [10, 10]},
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
    <Container ref={ref} id="content" data-testid="canvas_container">
      <Show when={isTauri()}><DragArea data-tauri-drag-region="true" /></Show>
      <LinkEnd />
      <Select target={() => ref} />
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
