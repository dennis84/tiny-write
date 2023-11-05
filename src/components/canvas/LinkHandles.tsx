import {createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {Box2d, Vec2d} from '@tldraw/primitives'
import {DragGesture} from '@use-gesture/vanilla'
import {EdgeType, useState} from '@/state'

const BORDER_SIZE = 30
const CIRCLE_RADIUS = 10
const CIRCLE_HOVER_RADIUS = 50

const LinkHandleDot = styled('span')`
  position: absolute;
  width: ${CIRCLE_HOVER_RADIUS.toString()}px;
  height: ${CIRCLE_HOVER_RADIUS.toString()}px;
  border-radius: ${CIRCLE_HOVER_RADIUS.toString()}px;
  background: transparent;
  cursor: var(--cursor-pointer);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: none;
  > span {
    width: ${CIRCLE_RADIUS.toString()}px;
    height: ${CIRCLE_RADIUS.toString()}px;
    border-radius: ${CIRCLE_RADIUS.toString()}px;
    background: transparent;
  }
  &:hover > span {
    background: var(--primary-background-80);
  }
`

interface Props {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgeProps extends Props {
  type: EdgeType;
}

const LinkHandle = (props: EdgeProps) => {
  let linkRef!: HTMLSpanElement

  const [, ctrl] = useState()
  const [currentLink, setCurrentLink] = createSignal<string>()
  const coords = () => {
    const box = new Box2d(props.x, props.y, props.width, props.height)
    const p = box.getHandlePoint(props.type)
    p.addXY(-CIRCLE_HOVER_RADIUS/2, -CIRCLE_HOVER_RADIUS/2)
    if (props.type === EdgeType.Top) {
      p.addXY(0, -BORDER_SIZE)
    } else if (props.type === EdgeType.Bottom) {
      p.addXY(0, BORDER_SIZE)
    } else if (props.type === EdgeType.Left) {
      p.addXY(-BORDER_SIZE, 0)
    } else if (props.type === EdgeType.Right) {
      p.addXY(BORDER_SIZE, 0)
    }

    const [x, y] = p.toArray()
    return [x, y]
  }

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const linkGesture = new DragGesture(linkRef, ({initial, first, last, movement}) => {
      if (first) {
        setCurrentLink(uuidv4())
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
      linkGesture.destroy()
    })
  })

  return (
    <LinkHandleDot
      style={{
        transform: `
          translate(${coords().map((n) => n + 'px').join(',')})
        `
      }}
      ref={linkRef}
      data-testid={`edge_${props.type}_link_handle`}
    >
      <span />
    </LinkHandleDot>
  )
}

export default (props: Props) => <>
  <LinkHandle {...props} type={EdgeType.Top} />
  <LinkHandle {...props} type={EdgeType.Right} />
  <LinkHandle {...props} type={EdgeType.Bottom} />
  <LinkHandle {...props} type={EdgeType.Left} />
</>
