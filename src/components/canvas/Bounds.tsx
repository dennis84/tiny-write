import {Show, createEffect, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {Canvas, CanvasBoxElement, CornerType, EdgeType, useState} from '@/state'
import {Box2d, PI, Vec2d, rotateSelectionHandle} from '@tldraw/primitives'

interface BoundsProps {
  ids: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  visible?: boolean;
  index?: number;
  onSelect?: (e: MouseEvent) => void;
  onDoubleClick?: () => void;
}

interface EdgeProps extends BoundsProps {
  type: EdgeType;
}

interface CornerProps extends BoundsProps {
  type: CornerType;
}

const BORDER_SIZE = 30
const BORDER_SIZE_2 = (BORDER_SIZE * 2)

const Border = styled('rect')`
  fill: transparent;
  cursor: ${(props: any) => props.vert ? 'ns-resize' : 'ew-resize'};
  touch-action: none;
`

interface GestureState {
  bounds: Box2d;
  elements: [string, Box2d][];
}

const createGestureState = (props: BoundsProps, canvas: Canvas): GestureState  => ({
  bounds: new Box2d(props.x, props.y, props.width, props.height),
  elements: props.ids.map((id) => {
    const el = canvas.elements.find((it) => it.id === id) as CanvasBoxElement
    return [id, new Box2d(el.x, el.y, el.width, el.height)]
  }),
})

const resizeElements = (
  context: GestureState,
  handle: EdgeType | CornerType,
  mx: number,
  my: number,
  shiftKey = false,
  snapToGrid = false,
): [string, Box2d][] => {
  const oppositeHandle = rotateSelectionHandle(handle, PI)
  const scalePoint = context.bounds.getHandlePoint(oppositeHandle)
  return context.elements.map(([id, element]) => {
    const result = Box2d.Resize(context.bounds, handle, mx, my, shiftKey)
    const s = new Vec2d(result.scaleX, result.scaleY)
    let {minX, minY, maxX, maxY} = element;

    const flipX = s.x < 0
    const flipY = s.y < 0
    if (flipX) {
      const t = maxX;
      maxX = minX;
      minX = t;
    }
    if (flipY) {
      const t = maxY;
      maxY = minY;
      minY = t;
    }

    const tl = new Vec2d(minX, minY).sub(scalePoint).mulV(s).add(scalePoint)
    const br = new Vec2d(maxX, maxY).sub(scalePoint).mulV(s).add(scalePoint)
    const box = new Box2d(tl.x, tl.y, br.x-tl.x, br.y-tl.y)
    if (snapToGrid) box.snapToGrid(10)
    return [id, box]
  })
}

const Edge = (props: EdgeProps) => {
  const [, ctrl] = useState()

  const vert = props.type === EdgeType.Top || props.type === EdgeType.Bottom
  let ref!: SVGRectElement

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const resizeGesture = new DragGesture(ref, ({event, movement: [mx, my], memo, first, shiftKey}) => {
      event.stopPropagation()
      const context: GestureState = first ? createGestureState(props, currentCanvas) : memo
      const {zoom} = currentCanvas.camera

      resizeElements(context, props.type, mx / zoom, my / zoom, shiftKey, currentCanvas.snapToGrid)
        .forEach(([id, box]) => {
          const rect = {x: box.x, y: box.y, width: box.w, height: box.h}
          ctrl.canvasCollab.updateElementThrottled({id, ...rect})
          ctrl.canvas.updateCanvasElement(id, rect)
        })

      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return context
    })

    onCleanup(() => {
      resizeGesture.destroy()
    })
  })

  createEffect(() => {
    const rw = vert ? props.width + BORDER_SIZE_2 : BORDER_SIZE
    const rh = vert ? BORDER_SIZE : props.height + BORDER_SIZE_2
    const rx = props.type === EdgeType.Right ? props.width + BORDER_SIZE : 0
    const ry = props.type === EdgeType.Bottom ? props.height + BORDER_SIZE : 0
    ref.setAttribute('x', rx.toString())
    ref.setAttribute('y', ry.toString())
    ref.setAttribute('width', rw.toString())
    ref.setAttribute('height', rh.toString())
  })

  return (
    <Border
      ref={ref}
      vert={vert}
      data-testid={`edge_${props.type}`}
    />
  )
}

const Corner = (props: CornerProps) => {
  let ref!: SVGRectElement
  const [, ctrl] = useState()
  const left = props.type === CornerType.TopLeft || props.type === CornerType.BottomLeft
  const bottom = props.type === CornerType.BottomLeft || props.type === CornerType.BottomRight
  const cursor = props.type === CornerType.TopLeft ? 'nwse-resize'
    : props.type === CornerType.TopRight ? 'nesw-resize'
    : props.type === CornerType.BottomLeft ? 'nesw-resize'
    : props.type === CornerType.BottomRight ? 'nwse-resize'
    : ''

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const gesture = new DragGesture(ref, ({event, movement: [mx, my], shiftKey, memo, first}) => {
      event.stopPropagation()
      const context: GestureState = first ? createGestureState(props, currentCanvas) : memo
      const {zoom} = currentCanvas.camera

      resizeElements(context, props.type, mx / zoom, my / zoom, shiftKey, currentCanvas.snapToGrid)
        .forEach(([id, box]) => {
          const rect = {x: box.x, y: box.y, width: box.w, height: box.h}
          ctrl.canvasCollab.updateElementThrottled({id, ...rect})
          ctrl.canvas.updateCanvasElement(id, rect)
        })

      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return context
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  createEffect(() => {
    const ex = left ? 0 : props.width + BORDER_SIZE
    const ey = bottom ? props.height + BORDER_SIZE   : 0
    ref.setAttribute('x', ex.toString())
    ref.setAttribute('y', ey.toString())
  })

  return (
    <rect
      ref={ref}
      width={BORDER_SIZE}
      height={BORDER_SIZE}
      style={{cursor, fill: 'transparent', 'touch-action': 'none'}}
      data-testid={`corner_${props.type}`}
    />
  )
}

const Bounds = styled('svg')`
  position: absolute;
  width: ${(props) => Number(props.width) + BORDER_SIZE_2}px;
  height: ${(props) => Number(props.height) + BORDER_SIZE_2}px;
  left: ${(props) => Number(props.x) - BORDER_SIZE}px;
  top: ${(props) => Number(props.y) - BORDER_SIZE}px;
  cursor: var(--cursor-grab);
  touch-action: none;
  &:active {
    cursor: var(--cursor-grabbed);
  }
`

export default (props: BoundsProps) => {
  let ref!: SVGSVGElement
  const [local, others] = splitProps(props, ['onSelect', 'onDoubleClick'])
  const [, ctrl] = useState()
  const currentCanvas = ctrl.canvas.currentCanvas
  if (!currentCanvas) return

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const gesture = new DragGesture(ref, ({first, movement: [mx, my], memo}) => {
      const context: GestureState = first ? createGestureState(props, currentCanvas) : memo
      const {zoom} = currentCanvas.camera

      context.elements.forEach(([id, initial]) => {
        const t = new Vec2d(mx, my).div(zoom).add(initial)
        if (currentCanvas.snapToGrid) t.snapToGrid(10)
        const [x, y] = t.toArray()

        ctrl.canvasCollab.updateElementThrottled({id, x, y})
        ctrl.canvas.updateCanvasElement(id, {x, y})
      })

      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return context
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return (
    <Bounds
      {...others}
      ref={ref}
      style={{'z-index': (props.index ?? 1) + 2}}
      onMouseDown={local.onSelect}
      onDblClick={local.onDoubleClick}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Edge {...others} type={EdgeType.Top} />
      <Edge {...others} type={EdgeType.Right} />
      <Edge {...others} type={EdgeType.Bottom} />
      <Edge {...others} type={EdgeType.Left} />
      <Corner {...others} type={CornerType.TopLeft} />
      <Corner {...others} type={CornerType.TopRight} />
      <Corner {...others} type={CornerType.BottomLeft} />
      <Corner {...others} type={CornerType.BottomRight} />
      <Show when={others.selected && props.visible}><Visible {...props} /></Show>
    </Bounds>
  )
}

const Visible = (props: BoundsProps) => {
  const STROKE_WIDTH = 2
  const RECT_WIDTH = 10
  const [, ctrl] = useState()

  const zoom = () => ctrl.canvas.currentCanvas?.camera.zoom ?? 1

  const VisibleCorner = styled('rect')`
    fill: var(--background);
    stroke: var(--primary-background);
    pointer-events: none;
    user-select: none;
  `

  const VisibleBorder = styled('rect')`
    fill: none;
    stroke: var(--primary-background);
    pointer-events: none;
    user-select: none;
  `

  return <>
    <VisibleBorder
      x={BORDER_SIZE}
      y={BORDER_SIZE}
      width={props.width}
      height={props.height}
      style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
    />
    <VisibleCorner
      x={BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      y={BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      width={RECT_WIDTH / zoom()}
      height={RECT_WIDTH / zoom()}
      style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
    />
    <VisibleCorner
      x={props.width + BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      y={BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      width={RECT_WIDTH / zoom()}
      height={RECT_WIDTH / zoom()}
      style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
    />
    <VisibleCorner
      x={BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      y={props.height + BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      width={RECT_WIDTH / zoom()}
      height={RECT_WIDTH / zoom()}
      style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
    />
    <VisibleCorner
      x={props.width + BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      y={props.height + BORDER_SIZE - (RECT_WIDTH / 2 / zoom())}
      width={RECT_WIDTH / zoom()}
      height={RECT_WIDTH / zoom()}
      style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
    />
  </>
}
