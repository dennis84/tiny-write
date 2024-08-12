import {createEffect, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Box, Vec, PI, VecLike} from '@tldraw/editor'
import {DragGesture} from '@use-gesture/vanilla'
import {Canvas, CanvasBoxElement, CanvasLinkElement, EdgeType, useState} from '@/state'
import {IndexType, ZIndex} from '@/utils/z-index'

const LinkSvg = styled('svg')`
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
  stroke-linecap: round;
  cursor: var(--cursor-grab);
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

export const Link = ({element}: {element: CanvasLinkElement}) => {
  let pathRef!: SVGLineElement
  let innerPathRef!: SVGLineElement
  let arrowheadRef!: SVGLineElement
  const [, ctrl] = useState()
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
    const linkGesture = new DragGesture(pathRef, async ({event, initial, first, last, movement, memo}) => {
      event.stopPropagation()
      const {zoom} = currentCanvas.camera
      const i = ctrl.canvas.getPosition(initial)
      if (!i) return

      let [fromId, fromEdge] = await memo ?? []

      if (first) {
        const fromEl = currentCanvas.elements.find((el) => el.id === element.from) as CanvasBoxElement
        const toEl = currentCanvas.elements.find((el) => el.id === element.to) as CanvasBoxElement
        const fromBox = new Box(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
        const toBox = new Box(toEl.x, toEl.y, toEl.width, toEl.height)
        const handleFrom = fromBox.getHandlePoint(element.fromEdge)
        const handleTo = toBox.getHandlePoint(element.toEdge!)
        const distFrom = Vec.Dist(handleFrom, i)
        const distTo = Vec.Dist(handleTo, i)

        if (distTo > distFrom) {
          fromId = element.to
          fromEdge = element.toEdge
        } else {
          fromId = element.from
          fromEdge = element.fromEdge
        }
      }

      const t = Vec.FromArray(movement).div(zoom).add(i)
      // If clicked and not dragged
      if (i.dist(t) <= 1) return [fromId, fromEdge]
      if (currentCanvas.snapToGrid) t.snapToGrid(10)

      ctrl.canvas.drawLink(element.id, fromId, fromEdge, t.x, t.y)
      if (last) await ctrl.canvas.drawLinkEnd(element.id)
      return [fromId, fromEdge]
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

    const [p, a] = getArrowPath(
      line,
      element.fromEdge,
      element.toEdge,
      10 / currentCanvas.camera.zoom
    )

    pathRef.setAttribute('d', p)
    innerPathRef.setAttribute('d', p)
    arrowheadRef.setAttribute('d', a)
  })

  return (
    <LinkSvg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        'z-index': ZIndex.element(index(), IndexType.LINK),
      }}
    >
      <Path
        ref={pathRef}
        onClick={onClick}
        selected={element.selected}
        style={{'stroke-width': `${25 / currentCanvas.camera.zoom}`}}
      />
      <InnerPath
        ref={innerPathRef}
        style={{'stroke-width': `${0.7 / currentCanvas.camera.zoom}`}}
      />
      <ArrowHead ref={arrowheadRef} />
    </LinkSvg>
  )
}

const getLine = (canvas: Canvas, element: CanvasLinkElement): [Vec, Vec] | undefined => {
  const fromEl = canvas.elements.find((el) => el.id === element.from) as CanvasBoxElement
  if (!fromEl) return

  const fromBox = new Box(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
  const a = fromBox.getHandlePoint(element.fromEdge)
  let b!: Vec

  if (element.toX !== undefined && element.toY !== undefined) {
    b = new Vec(element.toX, element.toY)
  } else if (element.to && element.toEdge !== undefined) {
    const toEl = canvas.elements.find((el) => el.id === element.to) as CanvasBoxElement
    if (!toEl) return
    const toBox = new Box(toEl.x, toEl.y, toEl.width, toEl.height)
    b = toBox.getHandlePoint(element.toEdge)
  }

  return [a, b]
}

const getPath = ([a, b]: [Vec, Vec], [c1, c2]: [Vec, Vec]): string => {
  const controlPoints = `C${c1.x},${c1.y} ${c2.x},${c2.y}`
  return `M${a.x},${a.y} ${controlPoints} ${b.x},${b.y}`
}

const getControlPointByEdge = (edge: EdgeType, len: number) => {
  switch (edge) {
  case (EdgeType.Left):
    return new Vec(-len, 0)
  case (EdgeType.Right):
    return new Vec(len, 0)
  case (EdgeType.Top):
    return new Vec(0, -len)
  case (EdgeType.Bottom):
    return new Vec(0, len)
  }
}

const getControlPoints = (
  [a, b]: [Vec, Vec],
  fromEdge: EdgeType,
  toEdge?: EdgeType,
): [Vec, Vec] => {
  const box = Box.FromPoints([a, b])
  const len = Math.max(box.height, box.width) / 2

  const f = Vec.From(a).add(getControlPointByEdge(fromEdge, len))
  const t = Vec.From(b)
  if (toEdge) t.add(getControlPointByEdge(toEdge, len))

  return [f, t]
}

const getArrowhead = (point: VecLike, int: VecLike) => {
  const PL = Vec.RotWith(int, point, PI / 6)
  const PR = Vec.RotWith(int, point, -PI / 6)
  return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}

const getArrowPath = (
  line: [Vec, Vec],
  fromEdge: EdgeType,
  toEdge?: EdgeType,
  arrowSize = 10,
): [string, string] => {
  const [c1, c2] = getControlPoints(line, fromEdge, toEdge)
  const p = getPath(line, [c1, c2])

  const t = toEdge
    ? Vec.From(line[1]).add(getControlPointByEdge(toEdge, 100))
    : Vec.Lrp(c1, line[1], 0.5)
  const i = Vec.Nudge(line[1], t, arrowSize)
  const a = getArrowhead(line[1], i)

  return [p, a]
}
