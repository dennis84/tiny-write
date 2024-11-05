import {For, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Gesture} from '@use-gesture/vanilla'
import {Vec} from '@tldraw/editor'
import {
  isEditorElement,
  isLinkElement,
  isImageElement,
  useState,
  isVideoElement,
  isCodeElement,
} from '@/state'
import {Select} from '../Select'
import {Grid} from './Grid'
import {Editor} from './Editor'
import {Link} from './Link'
import {Image} from './Image'
import {Video} from './Video'
import {ContextMenu} from './ContextMenu'
import {Bounds} from './Bounds'
import {CodeEditor} from './CodeEditor'
import {Toolbar} from './Toolbar'

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

export const Canvas = () => {
  const {store, canvasService} = useState()

  const scaleBounds = {min: 0.3, max: 10}
  let ref!: HTMLDivElement

  const onGridClick = () => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return
    if (store.selecting) return
    canvasService.deselect()
  }

  const zoomTo = (next: number, center?: number[]) => {
    if (!canvasService.currentCanvas?.camera) return

    let c
    if (center === undefined) {
      const {width, height} = ref.getBoundingClientRect()
      c = new Vec(width / 2, height / 2).toFixed()
    } else {
      c = Vec.FromArray(center)
    }

    const {zoom, point} = canvasService.currentCanvas.camera
    const p = Vec.FromArray(point)

    const p0 = c.clone().div(zoom).sub(p)
    const p1 = c.clone().div(next).sub(p)
    const [x, y] = p1.sub(p0).add(p).toFixed().toArray()
    canvasService.updateCamera({zoom: next, point: [x, y]})
  }

  onMount(() => {
    canvasService.canvasRef = ref
    const preventGesture = (e: TouchEvent) => e.preventDefault()
    // @ts-expect-error ???
    document.addEventListener('gesturestart', preventGesture)
    // @ts-expect-error ???
    document.addEventListener('gesturechange', preventGesture)
    // @ts-expect-error ???
    document.addEventListener('gestureend', preventGesture)

    const gesture = new Gesture(
      ref,
      {
        onPinch: ({origin: [ox, oy], offset: [s], last}) => {
          zoomTo(s, [ox, oy])
          canvasService.setMoving(!last)
        },
        onWheel: ({event, pinching, last, delta: [dx, dy]}) => {
          if (pinching) return false

          const target = event.target as HTMLElement
          if (target.closest('.ProseMirror') || target.closest('.cm-editor')) {
            return false
          }

          const currentCanvas = canvasService.currentCanvas
          if (!currentCanvas) return

          const {
            zoom,
            point: [x, y],
          } = currentCanvas.camera
          canvasService.updateCameraPoint([x - dx / zoom, y - dy / zoom])
          canvasService.setMoving(!last)
        },
      },
      {
        target: ref,
        eventOptions: {passive: false},
        drag: {delay: true, threshold: [10, 10]},
        wheel: {
          from: () => [
            -(canvasService.currentCanvas?.camera.point[0] ?? 0),
            -(canvasService.currentCanvas?.camera.point[1] ?? 0),
          ],
        },
        pinch: {
          scaleBounds,
          from: () => [canvasService.currentCanvas!.camera.zoom ?? 0, 0],
        },
      },
    )

    onCleanup(() => {
      gesture.destroy()
      // @ts-expect-error ???
      document.removeEventListener('gesturestart', preventGesture)
      // @ts-expect-error ???
      document.removeEventListener('gesturechange', preventGesture)
      // @ts-expect-error ???
      document.removeEventListener('gestureend', preventGesture)
    })
  })

  return (
    <Container ref={ref} id="content" data-testid="canvas_container">
      <ContextMenu />
      <Select target={() => ref} />
      <Grid onClick={onGridClick} />
      <Toolbar />
      <Board
        id="board"
        style={{
          transform: `
            scale(${canvasService.currentCanvas?.camera.zoom})
            translateX(${canvasService.currentCanvas?.camera.point[0]}px)
            translateY(${canvasService.currentCanvas?.camera.point[1]}px)
          `,
        }}
      >
        <Show when={canvasService.selection}>
          {(sel) => <Bounds selection={sel()} selected={true} visible={true} index={99999} />}
        </Show>
        <For each={canvasService.currentCanvas?.elements}>
          {(element, index) =>
            isEditorElement(element) ? <Editor element={element} index={index()} />
            : isCodeElement(element) ? <CodeEditor element={element} index={index()} />
            : isLinkElement(element) ? <Link element={element} />
            : isImageElement(element) ? <Image element={element} index={index()} />
            : isVideoElement(element) ? <Video element={element} index={index()} />
            : null
          }
        </For>
      </Board>
    </Container>
  )
}
