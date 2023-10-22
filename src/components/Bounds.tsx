import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {v4 as uuidv4} from 'uuid'
import {CornerType, EdgeType, ElementType, useState} from '@/state'
import {Box2d, Vec2d} from '@tldraw/primitives'

interface BoundsProps {
  id: string;
  elementType: ElementType;
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

const Border = styled('rect')`
  fill: transparent;
  cursor: ${(props: any) => props.vert ? 'ns-resize' : 'ew-resize'};
  touch-action: none;
`

const CIRCLE_RADIUS = 5
const BORDER_SIZE = 30
const BORDER_SIZE_2 = (BORDER_SIZE * 2)

const Edge = (props: EdgeProps) => {
  const [, ctrl] = useState()
  const [hovering, setHovering] = createSignal(false)
  const [currentLink, setCurrentLink] = createSignal<string>()

  const vert = props.type === EdgeType.Top || props.type === EdgeType.Bottom
  let ref!: SVGRectElement
  let linkRef!: SVGCircleElement

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const resizeGesture = new DragGesture(ref, ({event, movement: [mx, my], memo, first}) => {
      const initial: Box2d = first ? new Box2d(props.x, props.y, props.width, props.height) : memo
      event.stopPropagation()
      const {zoom} = currentCanvas.camera
      const box = initial.clone()

      box.resize(props.type, mx / zoom, my / zoom)
      if (currentCanvas.snapToGrid) box.snapToGrid(10)
      const rect = {x: box.x, y: box.y, width: box.w, height: box.h}

      ctrl.canvasCollab.updateElementThrottled({id: props.id, ...rect})
      ctrl.canvas.updateCanvasElement(props.id, rect)
      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
      return initial
    })

    const linkGesture = new DragGesture(linkRef, ({event, initial, first, last, movement}) => {
      event.stopPropagation()
      if (first) {
        setCurrentLink(uuidv4())
        setHovering(false)
      }
      const {point, zoom} = currentCanvas.camera
      const p = Vec2d.FromArray(point)
      const i = Vec2d.FromArray(initial).div(zoom).sub(p)
      const t = Vec2d.FromArray(movement).div(zoom).add(i)
      const id = currentLink()!
      ctrl.canvas.drawLink(id, props.id, props.type, t.x, t.y)
      if (last) {
        ctrl.canvas.drawLinkEnd(id)
        setCurrentLink(undefined)
      }
    })

    onCleanup(() => {
      resizeGesture.destroy()
      linkGesture.destroy()
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

    const cx =
      props.type === EdgeType.Left ? CIRCLE_RADIUS :
      props.type === EdgeType.Right ? props.width + BORDER_SIZE_2 - CIRCLE_RADIUS :
      (props.width / 2) + BORDER_SIZE
    const cy =
      props.type === EdgeType.Top ? CIRCLE_RADIUS :
      props.type === EdgeType.Bottom ? props.height + BORDER_SIZE_2 - CIRCLE_RADIUS :
      (props.height / 2) + BORDER_SIZE
    linkRef.setAttribute('cx', cx.toString())
    linkRef.setAttribute('cy', cy.toString())
  })

  return (
    <>
      <Border
        ref={ref}
        vert={vert}
        onMouseOver={() => setHovering(true)}
        onMouseOut={() => setHovering(false)}
        data-testid={`edge_${props.type}`}
      />
      <circle
        ref={linkRef}
        r={CIRCLE_RADIUS}
        onMouseOver={() => setHovering(true)}
        onMouseOut={() => setHovering(false)}
        stroke="transparent"
        stroke-width="10"
        style={{
          fill: hovering() ? 'var(--primary-background-80)' : 'transparent',
          cursor: 'pointer',
          'touch-action': 'none',
        }}
        data-testid={`edge_${props.type}_link_handle`}
      />
    </>
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
  cursor: move;
  touch-action: none;
  z-index: 2;
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

  return <>
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
  </>
}
