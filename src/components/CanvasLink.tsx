import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Box2d, LineSegment2d, PI, Vec2d, VecLike} from '@tldraw/primitives'
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
  z-index: ${(props: any) => props.index + 1};
`

const Path = styled('path')`
  stroke: transparent;
  stroke-width: 30;
  stroke-linecap: round;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  fill: none;
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
  stroke-width: 1;
  stroke-linecap: round;
  pointer-events: none;
  touch-action: none;
  fill: none;
`

const ArrowHead = styled('path')`
  pointer-events: none;
  touch-action: none;
  fill: var(--border);
`

export default ({element}: {element: CanvasLinkElement}) => {
  let pathRef!: SVGLineElement
  let innerPathRef!: SVGLineElement
  let arrowheadRef!: SVGLineElement
  const [, ctrl] = useState()
  const [from, setFrom] = createSignal<{id: string; edge: EdgeType}>()
  const currentCanvas = ctrl.canvas.currentCanvas
  if (!currentCanvas) return

  const index = () => {
    const fromIndex = currentCanvas.elements.findIndex((el) => el.id === element.from)
    const toIndex = currentCanvas.elements.findIndex((el) => el.id === element.to)
    return toIndex !== -1 ? Math.min(fromIndex, toIndex) : fromIndex
  }

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

    const line = getLine(currentCanvas, element)
    if (!line) return

    const toEdge = element.toEdge ?? (
      element.fromEdge === EdgeType.Top ? EdgeType.Bottom :
      element.fromEdge === EdgeType.Bottom ? EdgeType.Top :
      element.fromEdge === EdgeType.Left ? EdgeType.Right :
      EdgeType.Left
    )

    const p = getPath(line, element.fromEdge, element.toEdge)
    const i = Vec2d.Nudge(
      line.b,
      Vec2d.From(line.b).add(getControlPointByEdge(toEdge, 100)),
      10
    )

    const a = getArrowhead(line.b, i)

    pathRef.setAttribute('d', p)
    innerPathRef.setAttribute('d', p)
    arrowheadRef.setAttribute('d', a)
  })

  return (
    <Link
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      index={index()}
    >
      <Path ref={pathRef} onClick={onClick} selected={element.selected} />
      <InnerPath ref={innerPathRef} />
      <ArrowHead ref={arrowheadRef} />
    </Link>
  )
}

const getLine = (canvas: Canvas, element: CanvasLinkElement): LineSegment2d | undefined => {
  const fromEl = canvas.elements.find((el) => el.id === element.from) as CanvasEditorElement

  if (!fromEl) return
  const fromBox = new Box2d(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
  const a = fromBox.getHandlePoint(element.fromEdge)
  let b!: Vec2d

  if (element.toX !== undefined && element.toY !== undefined) {
    b = new Vec2d(element.toX, element.toY)
  } else if (element.to && element.toEdge !== undefined) {
    const toEl = canvas.elements.find((el) => el.id === element.to) as CanvasEditorElement
    const toBox = new Box2d(toEl.x, toEl.y, toEl.width, toEl.height)
    b = toBox.getHandlePoint(element.toEdge)
  }

  return new LineSegment2d(a, b)
}

const getPath = (line: LineSegment2d, fromEdge: EdgeType, toEdge?: EdgeType): string => {
  const [c1, c2] = getControlPoints(line, fromEdge, toEdge)
  const controlPoints = `C${c1.x},${c1.y} ${c2.x},${c2.y}`

  return `M${line.a.x},${line.a.y} ${controlPoints} ${line.b.x},${line.b.y}`
}

const getControlPointByEdge = (edge: EdgeType, len: number) => {
  switch (edge) {
  case (EdgeType.Left):
    return new Vec2d(-len, 0)
  case (EdgeType.Right):
    return new Vec2d(len, 0)
  case (EdgeType.Top):
    return new Vec2d(0, -len)
  case (EdgeType.Bottom):
    return new Vec2d(0, len)
  }
}

const getControlPoints = (
  line: LineSegment2d,
  fromEdge: EdgeType,
  toEdge?: EdgeType,
): [Vec2d, Vec2d] => {
  const box = Box2d.FromPoints([line.a, line.b])
  const len = Math.max(box.height, box.width) / 2

  const f = Vec2d.From(line.a).add(getControlPointByEdge(fromEdge, len))
  const t = Vec2d.From(line.b)
  if (toEdge) t.add(getControlPointByEdge(toEdge, len))

  return [f, t]
}

const getArrowhead = (point: VecLike, int: VecLike) => {
  const PL = Vec2d.RotWith(int, point, PI / 6)
  const PR = Vec2d.RotWith(int, point, -PI / 6)
  return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}
