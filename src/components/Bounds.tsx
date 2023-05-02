import {createEffect, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {useState} from '@/state'
import {CornerType, EdgeType} from '@/services/CanvasService'

interface BoundsProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgeProps extends BoundsProps {
  edge: EdgeType;
}

interface CornerProps extends BoundsProps {
  type: CornerType;
}

const Border = styled('rect')`
  fill: transparent;
  cursor: ${(props: any) => props.vert ? 'ns-resize' : 'ew-resize'};
  touch-action: none;
`

const BORDER_SIZE = 5
const BORDER_SIZE_2 = (BORDER_SIZE * 2)

const Edge = (props: EdgeProps) => {
  const [, ctrl] = useState()
  const vert = props.edge === EdgeType.Top || props.edge === EdgeType.Bottom
  let ref!: HTMLElement

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    const elementIndex = currentCanvas.elements.findIndex((el) => el.id === props.id)
    if (elementIndex === -1) return

    const gesture = new DragGesture(ref, ({delta: [dx, dy]}) => {
      const {zoom} = currentCanvas.camera
      switch (props.edge) {
      case EdgeType.Top:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          y: props.y + dy / zoom,
          height: props.height - dy / zoom,
        })
        break
      case EdgeType.Bottom:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          height: props.height + dy / zoom,
        })
        break
      case EdgeType.Left:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          x: props.x + dx / zoom,
          width: props.width - dx / zoom,
        })
        break
      case EdgeType.Right:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          width: props.width + dx / zoom,
        })
        break
      }
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  createEffect(() => {
    const ew = vert ? props.width + BORDER_SIZE_2 : BORDER_SIZE
    const eh = vert ? BORDER_SIZE : props.height + BORDER_SIZE_2
    const ex = props.edge === EdgeType.Right ? props.width + BORDER_SIZE : 0
    const ey = props.edge === EdgeType.Bottom ? props.height + BORDER_SIZE : 0
    ref.setAttribute('x', ex.toString())
    ref.setAttribute('y', ey.toString())
    ref.setAttribute('width', ew.toString())
    ref.setAttribute('height', eh.toString())
  })

  return (
    <Border ref={ref} vert={vert} />
  )
}

const Corner = (props: CornerProps) => {
  let ref!: SVGRectElement
  const [, ctrl] = useState()
  const size = 15
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

    const gesture = new DragGesture(ref, ({delta: [dx, dy]}) => {
      const {zoom} = currentCanvas.camera
      switch (props.type) {
      case CornerType.TopLeft:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          x: props.x + dx / zoom,
          y: props.y + dy / zoom,
          width: props.width - dx / zoom,
          height: props.height - dy / zoom,
        })
        break
      case CornerType.TopRight:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          y: props.y + dy / zoom,
          width: props.width + dx / zoom,
          height: props.height - dy / zoom,
        })
        break
      case CornerType.BottomLeft:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
          x: props.x + dx / zoom,
          width: props.width - dx / zoom,
          height: props.height + dy / zoom,
        })
        break
      case CornerType.BottomRight:
        ctrl.canvas.updateCanvasElement(currentCanvas.id, elementIndex, {
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
  z-index: 0;
`

export default (props: BoundsProps) => {
  return (
    <Bounds {...props} version="1.1" xmlns="http://www.w3.org/2000/svg">
      <Corner {...props} type={CornerType.TopLeft} />
      <Corner {...props} type={CornerType.TopRight} />
      <Corner {...props} type={CornerType.BottomLeft} />
      <Corner {...props} type={CornerType.BottomRight} />
      <Edge {...props} edge={EdgeType.Top} />
      <Edge {...props} edge={EdgeType.Right} />
      <Edge {...props} edge={EdgeType.Bottom} />
      <Edge {...props} edge={EdgeType.Left} />
    </Bounds>
  )
}
