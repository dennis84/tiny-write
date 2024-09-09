import {createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {Box, Vec} from '@tldraw/editor'
import {DragGesture} from '@use-gesture/vanilla'
import {EdgeType, useState} from '@/state'
import {IndexType, ZIndex} from '@/utils/ZIndex'

const BORDER_SIZE = 20
const CIRCLE_RADIUS = 7
const CIRCLE_HOVER_RADIUS = 40

const LinkHandleDot = styled('span')`
  position: absolute;
  width: ${CIRCLE_HOVER_RADIUS.toString()}px;
  height: ${CIRCLE_HOVER_RADIUS.toString()}px;
  border-radius: 999px;
  cursor: var(--cursor-pointer);
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: none;
  > span {
    width: ${CIRCLE_RADIUS.toString()}px;
    height: ${CIRCLE_RADIUS.toString()}px;
    border-radius: 999px;
    background: transparent;
  }
  &:hover > span {
    background: var(--primary-background-80);
  }
`

interface Props {
  id: string
  x: number
  y: number
  width: number
  height: number
  index: number
}

interface EdgeProps extends Props {
  type: EdgeType
}

const LinkHandle = (props: EdgeProps) => {
  let linkRef!: HTMLSpanElement

  const {canvasService, canvasCollabService} = useState()
  const [currentLink, setCurrentLink] = createSignal<string>()

  const zoom = () => canvasService.currentCanvas?.camera.zoom ?? 1

  const coords = () => {
    const box = new Box(props.x, props.y, props.width, props.height)
    const p = box.getHandlePoint(props.type)
    p.addXY(-CIRCLE_HOVER_RADIUS / 2, -CIRCLE_HOVER_RADIUS / 2)
    if (props.type === EdgeType.Top) {
      p.addXY(0, -BORDER_SIZE / zoom())
    } else if (props.type === EdgeType.Bottom) {
      p.addXY(0, BORDER_SIZE / zoom())
    } else if (props.type === EdgeType.Left) {
      p.addXY(-BORDER_SIZE / zoom(), 0)
    } else if (props.type === EdgeType.Right) {
      p.addXY(BORDER_SIZE / zoom(), 0)
    }

    const [x, y] = p.toArray()
    return [x, y]
  }

  onMount(() => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const linkGesture = new DragGesture(
      linkRef,
      async ({event, initial, first, last, movement}) => {
        event.stopPropagation()
        if (first) {
          setCurrentLink(uuidv4())
        }
        const {point, zoom} = currentCanvas.camera
        const p = Vec.FromArray(point)
        const i = Vec.FromArray(initial).div(zoom).sub(p)
        const t = Vec.FromArray(movement).div(zoom).add(i)
        const id = currentLink()!
        canvasService.drawLink(id, props.id, props.type, t.x, t.y)
        if (last) {
          const el = await canvasService.drawLinkEnd(id)
          if (el) canvasCollabService.addElement(el)
          setCurrentLink(undefined)
        }
      },
    )

    onCleanup(() => {
      linkGesture.destroy()
    })
  })

  return (
    <LinkHandleDot
      style={{
        'transform': `
          scale(${1 / zoom()})
          translate(${coords()
            .map((n) => n * zoom() + 'px')
            .join(',')})
        `,
        'z-index': `${ZIndex.element(props.index, IndexType.HANDLE)}`,
      }}
      ref={linkRef}
      data-testid={`edge_${props.type}_link_handle`}
    >
      <span />
    </LinkHandleDot>
  )
}

export const LinkHandles = (props: Props) => (
  <>
    <LinkHandle {...props} type={EdgeType.Top} />
    <LinkHandle {...props} type={EdgeType.Right} />
    <LinkHandle {...props} type={EdgeType.Bottom} />
    <LinkHandle {...props} type={EdgeType.Left} />
  </>
)
