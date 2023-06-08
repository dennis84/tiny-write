import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {v4 as uuidv4} from 'uuid'
import {CornerType, EdgeType, ElementType, useState} from '@/state'
import {Vec2d} from '@tldraw/primitives'

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

const BORDER_SIZE = 20
const BORDER_SIZE_2 = (BORDER_SIZE * 2)
const MIN_SIZE = 100

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
      const type = props.elementType

      if (props.type === EdgeType.Top) {
        const height = props.height - dy / zoom
        const y = props.y + dy / zoom
        if (height < MIN_SIZE) return
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, y, height})
      } else if (props.type === EdgeType.Bottom) {
        const height = props.height + dy / zoom
        if (height < MIN_SIZE) return
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, height})
      } else if (props.type === EdgeType.Left) {
        const width = props.width - dx / zoom
        const x = props.x + dx / zoom
        if (width < MIN_SIZE) return
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, x, width})
      } else if (props.type === EdgeType.Right) {
        const width = props.width + dx / zoom
        if (width < MIN_SIZE) return
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, width})
      }

      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
    })

    const linkGesture = new DragGesture(linkRef, ({event, initial, first, last, movement}) => {
      event.stopPropagation()
      if (first) setCurrentLink(uuidv4())
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

    const BS = (props.selected ? 5 : 3) / 2

    const cx =
      props.type === EdgeType.Left ? BORDER_SIZE - BS :
      props.type === EdgeType.Right ? props.width + BORDER_SIZE + BS :
      (props.width / 2) + BORDER_SIZE
    const cy =
      props.type === EdgeType.Top ? BORDER_SIZE - BS :
      props.type === EdgeType.Bottom ? props.height + BORDER_SIZE + BS :
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
        r={12}
        onMouseOver={() => setHovering(true)}
        onMouseOut={() => setHovering(false)}
        style={{
          fill: hovering() ? 'var(--border)' : 'transparent',
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

    const ratio = props.width / props.height
    const gesture = new DragGesture(ref, ({event, delta: [dx, dy], shiftKey}) => {
      event.stopPropagation()
      const {zoom} = currentCanvas.camera
      const type = props.elementType

      if (props.type === CornerType.TopLeft) {
        let x = props.x + dx / zoom
        let y = props.y + (shiftKey ? dx / ratio : dy) / zoom
        let width = props.width - dx / zoom
        let height = shiftKey ? width / ratio : props.height - dy / zoom

        if (shiftKey && (width < MIN_SIZE || height < MIN_SIZE)) {
          width = props.width
          height = props.height
          x = props.x
          y = props.y
        } else {
          if (width < MIN_SIZE) {
            width = props.width
            x = props.x
          }
          if (height < MIN_SIZE) {
            height = props.height
            y = props.y
          }
        }

        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, x, y, width, height})
      } else if (props.type === CornerType.TopRight) {
        let width = props.width + dx / zoom
        let height = shiftKey ? width / ratio : props.height - dy / zoom
        let y = props.y + (shiftKey ? -dx / ratio : dy) / zoom

        if (shiftKey && (width < MIN_SIZE || height < MIN_SIZE)) {
          width = props.width
          height = props.height
          y = props.y
        } else {
          if (width < MIN_SIZE) {
            width = props.width
            y = props.y
          }
          if (height < MIN_SIZE) {
            height = props.height
            y = props.y
          }
        }
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, y, width, height})
      } else if (props.type === CornerType.BottomLeft) {
        let x = props.x + dx / zoom
        let width = props.width - dx / zoom
        let height = shiftKey ? width / ratio : props.height + dy / zoom

        if (shiftKey && (width < MIN_SIZE || height < MIN_SIZE)) {
          width = props.width
          height = props.height
          x = props.x
        } else {
          if (width < MIN_SIZE) {
            width = props.width
            x = props.x
          }
          if (height < MIN_SIZE) {
            height = props.height
          }
        }
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, x, width, height})
      } else if (props.type === CornerType.BottomRight) {
        let width = props.width + dx / zoom
        let height = shiftKey ? width / ratio : props.height + dy / zoom
        if (shiftKey && (width < MIN_SIZE || height < MIN_SIZE)) {
          width = props.width
          height = props.height
        } else {
          if (width < MIN_SIZE) {
            width = props.width
          }
          if (height < MIN_SIZE) {
            height = props.height
          }
        }
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {type, width, height})
      }

      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
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
        type: props.elementType,
        x: props.x + dx / zoom,
        y: props.y + dy / zoom,
      })

      ctrl.canvas.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      ctrl.canvas.saveCanvasDebounced()
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
