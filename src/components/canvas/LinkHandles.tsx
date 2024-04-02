import {createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {Box, Vec} from '@tldraw/editor'
import {DragGesture} from '@use-gesture/vanilla'
import {EdgeType, useState} from '@/state'
import {IndexType, zIndex} from '@/utils/z-index'

const BORDER_SIZE = 20
const CIRCLE_RADIUS = 7
const CIRCLE_HOVER_RADIUS = 40

const LinkHandleDot = styled('span')`
  position: absolute;
  width: ${(props: any) => (CIRCLE_HOVER_RADIUS / props.zoom).toString()}px;
  height: ${(props: any) => (CIRCLE_HOVER_RADIUS / props.zoom).toString()}px;
  border-radius: 999px;
  background: transparent;
  cursor: var(--cursor-pointer);
  z-index: ${(props: any) => zIndex(props.index, IndexType.HANDLE)};
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: none;
  > span {
    width: ${(props: any) => (CIRCLE_RADIUS / props.zoom).toString()}px;
    height: ${(props: any) => (CIRCLE_RADIUS / props.zoom).toString()}px;
    border-radius: 999px;
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
  index: number;
}

interface EdgeProps extends Props {
  type: EdgeType;
}

const LinkHandle = (props: EdgeProps) => {
  let linkRef!: HTMLSpanElement

  const [, ctrl] = useState()
  const [currentLink, setCurrentLink] = createSignal<string>()

  const zoom = () => ctrl.canvas.currentCanvas?.camera.zoom ?? 1

  const coords = () => {
    const box = new Box(props.x, props.y, props.width, props.height)
    const p = box.getHandlePoint(props.type)
    p.addXY(-CIRCLE_HOVER_RADIUS/zoom()/2, -CIRCLE_HOVER_RADIUS/zoom()/2)
    if (props.type === EdgeType.Top) {
      p.addXY(0, -BORDER_SIZE/zoom())
    } else if (props.type === EdgeType.Bottom) {
      p.addXY(0, BORDER_SIZE/zoom())
    } else if (props.type === EdgeType.Left) {
      p.addXY(-BORDER_SIZE/zoom(), 0)
    } else if (props.type === EdgeType.Right) {
      p.addXY(BORDER_SIZE/zoom(), 0)
    }

    const [x, y] = p.toArray()
    return [x, y]
  }

  onMount(() => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const linkGesture = new DragGesture(linkRef, async ({event, initial, first, last, movement}) => {
      event.stopPropagation()
      if (first) {
        setCurrentLink(uuidv4())
      }
      const {point, zoom} = currentCanvas.camera
      const p = Vec.FromArray(point)
      const i = Vec.FromArray(initial).div(zoom).sub(p)
      const t = Vec.FromArray(movement).div(zoom).add(i)
      const id = currentLink()!
      ctrl.canvas.drawLink(id, props.id, props.type, t.x, t.y)
      if (last) {
        await ctrl.canvas.drawLinkEnd(id)
        setCurrentLink(undefined)
      }
    })

    onCleanup(() => {
      linkGesture.destroy()
    })
  })

  return (
    <LinkHandleDot
      zoom={zoom()}
      index={props.index}
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
