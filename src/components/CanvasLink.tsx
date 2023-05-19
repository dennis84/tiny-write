import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Box2d, Vec2d} from '@tldraw/primitives'
import {DragGesture} from '@use-gesture/vanilla'
import {Canvas, CanvasEditorElement, CanvasLinkElement, EdgeType, useState} from '@/state'

const Link = styled('svg')`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-width: 50px;
  min-height: 50px;
  transform-origin: top left;
  overflow: visible;
  pointer-events: none;
`

const Path = styled('path')`
  stroke: transparent;
  stroke-width: 30;
  stroke-linecap: round;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  ${(props: any) => props.selected ? `
    stroke: var(--border-30);
  ` : `
    &:hover {
      stroke: var(--border-20);
    }
  `}
`

const InnerPath = styled('path')`
  stroke: var(--border);
  stroke-width: 3;
  stroke-linecap: round;
  pointer-events: none;
  touch-action: none;
`

export default ({element}: {element: CanvasLinkElement}) => {
  let pathRef!: SVGLineElement
  let innerPathRef!: SVGLineElement
  const [, ctrl] = useState()
  const [from, setFrom] = createSignal<{id: string; edge: EdgeType}>()
  const currentCanvas = ctrl.canvas.currentCanvas
  if (!currentCanvas) return

  const onClick = () => {
    ctrl.canvas.select(element.id)
  }

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const linkGesture = new DragGesture(pathRef, ({event, initial, first, last, movement}) => {
      event.stopPropagation()
      const {point, zoom} = currentCanvas.camera
      const p = Vec2d.FromArray(point)
      const i = Vec2d.FromArray(initial).div(zoom).sub(p)

      if (first) {
        ctrl.canvas.generateElementMap()
        const fromEl = currentCanvas.elements.find((el) => el.id === element.from) as CanvasEditorElement
        const toEl = currentCanvas.elements.find((el) => el.id === element.to) as CanvasEditorElement
        const fromBox = new Box2d(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
        const toBox = new Box2d(toEl.x, toEl.y, toEl.width, toEl.height)
        const handleFrom = fromBox.getHandlePoint(element.fromEdge)
        const handleTo = toBox.getHandlePoint(element.toEdge!)
        const distFrom = Vec2d.Dist(handleFrom, i)
        const distTo = Vec2d.Dist(handleTo, i)

        if (distTo > distFrom) {
          setFrom({id: element.to!, edge: element.toEdge!})
        } else {
          setFrom({id: element.from, edge: element.fromEdge})
        }
      }

      const t = Vec2d.FromArray(movement).div(zoom).add(i)
      const f = from()!

      if (i.dist(t) <= 1) return

      ctrl.canvas.drawLink(element.id, f.id, f.edge, t.x, t.y)
      if (last) ctrl.canvas.drawLinkEnd(element.id)
    })

    onCleanup(() => {
      linkGesture.destroy()
    })
  })

  createEffect(() => {
    if (element.to === undefined && element.toX === undefined) {
      return
    }

    const p = getPath(currentCanvas, element)
    if (!p) return
    pathRef.setAttribute('d', p)
    innerPathRef.setAttribute('d', p)
  })

  return (
    <Link version="1.1" xmlns="http://www.w3.org/2000/svg">
      <Path ref={pathRef} onClick={onClick} selected={element.selected} />
      <InnerPath ref={innerPathRef} />
    </Link>
  )
}

const getPath = (canvas: Canvas, element: CanvasLinkElement): string | undefined => {
  const fromEl = canvas.elements.find((el) => el.id === element.from) as CanvasEditorElement

  if (!fromEl) return
  const fromBox = new Box2d(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
  const [x1, y1] = fromBox.getHandlePoint(element.fromEdge).toArray()
  let x2, y2

  if (element.toX !== undefined && element.toY !== undefined) {
    x2 = element.toX
    y2 = element.toY
  } else if (element.to && element.toEdge !== undefined) {
    const toEl = canvas.elements.find((el) => el.id === element.to) as CanvasEditorElement
    const toBox = new Box2d(toEl.x, toEl.y, toEl.width, toEl.height)
    ;[x2, y2] = toBox.getHandlePoint(element.toEdge).toArray()
  }

  return `M${x1},${y1}L${x2},${y2}`
}
