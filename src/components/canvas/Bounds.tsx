import {createEffect, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {CornerType, EdgeType, useState} from '@/state'
import {Box2d, Vec2d} from '@tldraw/primitives'

interface BoundsProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  onSelect?: () => void;
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

const Edge = (props: EdgeProps) => {
  const [, ctrl] = useState()

  const vert = props.type === EdgeType.Top || props.type === EdgeType.Bottom
  let ref!: SVGRectElement

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const resizeGesture = new DragGesture(ref, ({event, movement: [mx, my], memo, first, shiftKey}) => {
      event.stopPropagation()
      const initial: Box2d = first ? new Box2d(props.x, props.y, props.width, props.height) : memo
      const {zoom} = currentCanvas.camera
      const box = Box2d.Resize(initial, props.type, mx / zoom, my / zoom, shiftKey).box

      if (currentCanvas.snapToGrid) box.snapToGrid(10)
      const rect = {x: box.x, y: box.y, width: box.w, height: box.h}

      ctrl.canvasCollab.updateElementThrottled({id: props.id, ...rect})
      ctrl.canvas.updateCanvasElement(props.id, rect)
      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return initial
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
      const initial: Box2d = first ? new Box2d(props.x, props.y, props.width, props.height) : memo
      const {zoom} = currentCanvas.camera
      const x = mx / zoom
      const y = my / zoom

      const box = Box2d.Resize(initial, props.type, x, y, shiftKey).box
      if (currentCanvas.snapToGrid) box.snapToGrid(10)

      const rect = {x: box.x, y: box.y, width: box.w, height: box.h}
      ctrl.canvasCollab.updateElementThrottled({id: props.id, ...rect})
      ctrl.canvas.updateCanvasElement(props.id, rect)
      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return initial
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
  z-index: 2;
  &:active {
    cursor: var(--cursor-grabbed);
  }
`

export default (props: BoundsProps) => {
  let ref!: SVGSVGElement
  const [, ctrl] = useState()
  const currentCanvas = ctrl.canvas.currentCanvas
  if (!currentCanvas) return

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const gesture = new DragGesture(ref, ({first, movement: [mx, my], memo}) => {
      const initial = first ? new Vec2d(props.x, props.y) : memo
      const {zoom} = currentCanvas.camera

      const t = new Vec2d(mx, my).div(zoom).add(initial)
      if (currentCanvas.snapToGrid) t.snapToGrid(10)
      const [x, y] = t.toArray()

      ctrl.canvasCollab.updateElementThrottled({id: props.id, x, y})
      ctrl.canvas.updateCanvasElement(props.id, {x, y})
      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return initial
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return (
    <Bounds
      {...props}
      ref={ref}
      onMouseDown={props.onSelect}
      onDblClick={props.onDoubleClick}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Edge {...props} type={EdgeType.Top} />
      <Edge {...props} type={EdgeType.Right} />
      <Edge {...props} type={EdgeType.Bottom} />
      <Edge {...props} type={EdgeType.Left} />
      <Corner {...props} type={CornerType.TopLeft} />
      <Corner {...props} type={CornerType.TopRight} />
      <Corner {...props} type={CornerType.BottomLeft} />
      <Corner {...props} type={CornerType.BottomRight} />
    </Bounds>
  )
}
