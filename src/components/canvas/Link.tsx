import {createEffect, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {Segment, Vector} from '@flatten-js/core'
import {type Canvas, type CanvasBoxElement, type CanvasLinkElement, EdgeType, useState} from '@/state'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {BoxUtil} from '@/utils/BoxUtil'
import {VecUtil} from '@/utils/VecUtil'
import {PointUtil} from '@/utils/PointUtil'

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

// biome-ignore format: ternary breaks ugly
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
  const {canvasService, canvasCollabService} = useState()
  const currentCanvas = canvasService.currentCanvas
  if (!currentCanvas) return

  const index = () => {
    const fromIndex = currentCanvas.elements.findIndex((el) => el.id === element.from)
    const toIndex = currentCanvas.elements.findIndex((el) => el.id === element.to)
    return toIndex !== -1 ? Math.min(fromIndex, toIndex) : fromIndex
  }

  const onClick = () => {
    canvasService.select(element.id)
  }

  onMount(() => {
    const linkGesture = new DragGesture(
      pathRef,
      async ({event, initial, first, last, movement, memo}) => {
        event.stopPropagation()
        const {zoom} = currentCanvas.camera
        const i = canvasService.getPosition(initial)
        if (!i) return

        let [fromId, fromEdge] = (await memo) ?? []

        if (first) {
          const fromEl = currentCanvas.elements.find(
            (el) => el.id === element.from,
          ) as CanvasBoxElement
          const toEl = currentCanvas.elements.find((el) => el.id === element.to) as CanvasBoxElement
          const fromBox = BoxUtil.fromRect(fromEl)
          const toBox = BoxUtil.fromRect(toEl)
          const segmentFrom = BoxUtil.getSegment(fromBox, element.fromEdge)
          const segmentTo = BoxUtil.getSegment(toBox, element.toEdge!)
          const distFrom = segmentFrom.distanceTo(i)
          const distTo = segmentTo.distanceTo(i)

          if (distTo > distFrom) {
            fromId = element.to
            fromEdge = element.toEdge
          } else {
            fromId = element.from
            fromEdge = element.fromEdge
          }
        }

        const t = VecUtil.fromArray(movement)
          .multiply(1 / zoom)
          .add(i)

        // If clicked and not dragged
        if (PointUtil.fromVec(i).distanceTo(PointUtil.fromVec(t))?.[0] <= 1) {
          return [fromId, fromEdge]
        }

        if (currentCanvas.snapToGrid) VecUtil.snapToGrid(t, 10)

        canvasService.drawLink(element.id, fromId, fromEdge, t.x, t.y)
        if (last) {
          const el = await canvasService.drawLinkEnd(element.id)
          if (el) canvasCollabService.addElement(el)
        }

        return [fromId, fromEdge]
      },
    )

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
      10 / currentCanvas.camera.zoom,
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

const getLine = (canvas: Canvas, element: CanvasLinkElement): [Vector, Vector] | undefined => {
  const fromEl = canvas.elements.find((el) => el.id === element.from) as CanvasBoxElement
  if (!fromEl) return

  const fromBox = BoxUtil.fromRect(fromEl)
  const a = BoxUtil.getHandlePoint(fromBox, element.fromEdge)
  let b!: Vector

  if (element.toX !== undefined && element.toY !== undefined) {
    b = new Vector(element.toX, element.toY)
  } else if (element.to && element.toEdge !== undefined) {
    const toEl = canvas.elements.find((el) => el.id === element.to) as CanvasBoxElement
    if (!toEl) return
    const toBox = BoxUtil.fromRect(toEl)
    b = BoxUtil.getHandlePoint(toBox, element.toEdge)
  }

  return [a, b]
}

const getPath = ([a, b]: [Vector, Vector], [c1, c2]: [Vector, Vector]): string => {
  const controlPoints = `C${c1.x},${c1.y} ${c2.x},${c2.y}`
  return `M${a.x},${a.y} ${controlPoints} ${b.x},${b.y}`
}

const getControlPointByEdge = (edge: EdgeType, len: number) => {
  switch (edge) {
    case EdgeType.Left:
      return new Vector(-len, 0)
    case EdgeType.Right:
      return new Vector(len, 0)
    case EdgeType.Top:
      return new Vector(0, -len)
    case EdgeType.Bottom:
      return new Vector(0, len)
  }
}

const getControlPoints = (
  [a, b]: [Vector, Vector],
  fromEdge: EdgeType,
  toEdge?: EdgeType,
): [Vector, Vector] => {
  const box = BoxUtil.fromLowHigh(a, b)
  const len = Math.max(box.height, box.width) / 2

  const f = a.add(getControlPointByEdge(fromEdge, len))
  const t = toEdge ? b.add(getControlPointByEdge(toEdge, len)) : b

  return [f, t]
}

const getArrowhead = (point: Vector, int: Vector) => {
  const PL = VecUtil.rotate(int, Math.PI / 6, point)
  const PR = VecUtil.rotate(int, -Math.PI / 6, point)
  return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}

const getArrowPath = (
  line: [Vector, Vector],
  fromEdge: EdgeType,
  toEdge?: EdgeType,
  arrowSize = 10,
): [string, string] => {
  const [c1, c2] = getControlPoints(line, fromEdge, toEdge)
  const p = getPath(line, [c1, c2])

  const seg = new Segment(PointUtil.fromVec(toEdge ? c2 : c1), PointUtil.fromVec(line[1]))
  const t = (seg.length - arrowSize) / seg.length
  const a = getArrowhead(line[1], VecUtil.lrp(toEdge ? c2 : c1, line[1], t))

  return [p, a]
}
