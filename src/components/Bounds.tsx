import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {v4 as uuidv4} from 'uuid'
import {CornerType, EdgeType, ElementType, useState} from '@/state'
import {Vec2d} from '@tldraw/primitives'

interface BoundsProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
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

const BORDER_SIZE = 20
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
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === props.id)
    if (elementIndex === -1) return

    const resizeGesture = new DragGesture(ref, ({event, delta: [dx, dy]}) => {
      event.stopPropagation()
      const {zoom} = currentCanvas.camera
      switch (props.type) {
      case EdgeType.Top:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          y: props.y + dy / zoom,
          height: props.height - dy / zoom,
        })
        break
      case EdgeType.Bottom:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          height: props.height + dy / zoom,
        })
        break
      case EdgeType.Left:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          x: props.x + dx / zoom,
          width: props.width - dx / zoom,
        })
        break
      case EdgeType.Right:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          width: props.width + dx / zoom,
        })
        break
      }
    })

    const linkGesture = new DragGesture(linkRef, ({event, initial, first, last, movement}) => {
      event.stopPropagation()
      if (first) {
        setCurrentLink(uuidv4())
        ctrl.canvas.generateElementMap()
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
      props.type === EdgeType.Left ? BORDER_SIZE - 1 :
      props.type === EdgeType.Right ? props.width + BORDER_SIZE + 1 :
      (props.width / 2) + BORDER_SIZE
    const cy =
      props.type === EdgeType.Top ? BORDER_SIZE - 1 :
      props.type === EdgeType.Bottom ? props.height + BORDER_SIZE + 1 :
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
      />
      <circle
        ref={linkRef}
        r="12"
        onMouseOver={() => setHovering(true)}
        onMouseOut={() => setHovering(false)}
        style={{
          fill: hovering() ? 'var(--primary-background)' : 'transparent',
          cursor: 'grab',
          'touch-action': 'none',
        }}
      />
    </>
  )
}

const Corner = (props: CornerProps) => {
  let ref!: SVGRectElement
  const [, ctrl] = useState()
  const size = 20
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
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === props.id)
    if (elementIndex === -1) return

    const gesture = new DragGesture(ref, ({event, delta: [dx, dy]}) => {
      event.stopPropagation()
      const {zoom} = currentCanvas.camera
      switch (props.type) {
      case CornerType.TopLeft:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          x: props.x + dx / zoom,
          y: props.y + dy / zoom,
          width: props.width - dx / zoom,
          height: props.height - dy / zoom,
        })
        break
      case CornerType.TopRight:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          y: props.y + dy / zoom,
          width: props.width + dx / zoom,
          height: props.height - dy / zoom,
        })
        break
      case CornerType.BottomLeft:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          x: props.x + dx / zoom,
          width: props.width - dx / zoom,
          height: props.height + dy / zoom,
        })
        break
      case CornerType.BottomRight:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          type: ElementType.Editor,
          width: props.width + dx / zoom,
          height: props.height + dy / zoom,
        })
        break
      }
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  createEffect(() => {
    const ex = left ? 0 : props.width + BORDER_SIZE_2 - size
    const ey = bottom ? props.height + BORDER_SIZE_2 - size : 0
    ref.setAttribute('x', ex.toString())
    ref.setAttribute('y', ey.toString())
  })

  return (
    <rect
      ref={ref}
      width={size}
      height={size}
      style={{cursor, fill: 'transparent', 'touch-action': 'none'}}
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

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === props.id)
    if (elementIndex === -1) return

    const gesture = new DragGesture(ref, ({delta: [dx, dy]}) => {
      const {zoom} = currentCanvas.camera
      ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
        type: ElementType.Editor,
        x: props.x + dx / zoom,
        y: props.y + dy / zoom,
      })
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
