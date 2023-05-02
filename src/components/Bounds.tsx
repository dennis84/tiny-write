import {createEffect, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {useState} from '@/state'
import {EdgeType} from '@/services/CanvasService'

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
    const gesture = new DragGesture(ref, ({delta: [dx, dy]}) => {
      ctrl.canvas.resizeElement(props.id, props.edge, vert ? dy * 2 : dx * 2)
    }, {
      from: [props.x, props.y]
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  createEffect(() => {
    const ew = vert ? props.width + BORDER_SIZE_2 : BORDER_SIZE
    const eh = vert ? BORDER_SIZE : props.height + BORDER_SIZE_2
    const ex = props.edge === EdgeType.Right ? props.width + BORDER_SIZE : 0;
    const ey = props.edge === EdgeType.Bottom ? props.height + BORDER_SIZE : 0;
    ref.setAttribute('x', ex.toString())
    ref.setAttribute('y', ey.toString())
    ref.setAttribute('width', ew.toString())
    ref.setAttribute('height', eh.toString())
  })

  return (
    <Border ref={ref} vert={vert} />
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
      <Edge {...props} edge={EdgeType.Top} />
      <Edge {...props} edge={EdgeType.Right} />
      <Edge {...props} edge={EdgeType.Bottom} />
      <Edge {...props} edge={EdgeType.Left} />
    </Bounds>
  )
}
