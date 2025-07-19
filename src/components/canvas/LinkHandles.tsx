import {onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {DragGesture} from '@use-gesture/vanilla'
import {Vector} from '@flatten-js/core'
import {EdgeType, useState} from '@/state'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {BoxUtil} from '@/utils/BoxUtil'

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

  const zoom = () => canvasService.currentCanvas?.camera.zoom ?? 1

  const coords = () => {
    const box = canvasService.createBox(props)
    let p = BoxUtil.getHandlePoint(box, props.type)
    p = p.translate(-CIRCLE_HOVER_RADIUS / 2, -CIRCLE_HOVER_RADIUS / 2)
    if (props.type === EdgeType.Top) {
      p = p.translate(0, -BORDER_SIZE / zoom())
    } else if (props.type === EdgeType.Bottom) {
      p = p.translate(0, BORDER_SIZE / zoom())
    } else if (props.type === EdgeType.Left) {
      p = p.translate(-BORDER_SIZE / zoom(), 0)
    } else if (props.type === EdgeType.Right) {
      p = p.translate(BORDER_SIZE / zoom(), 0)
    }

    p = p.multiply(zoom())

    return `${p.x}px, ${p.y}px`
  }

  onMount(() => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const linkGesture = new DragGesture(
      linkRef,
      async ({event, initial, first, last, movement, memo}) => {
        event.stopPropagation()
        if (first) {
          return uuidv4()
        }

        const id = await memo
        const {point, zoom} = currentCanvas.camera
        const p = new Vector(point[0], point[1])
        const i = new Vector(initial[0], initial[1]).multiply(1 / zoom).subtract(p)
        const t = new Vector(movement[0], movement[1]).multiply(1 / zoom).add(i)

        canvasService.drawLink(id, props.id, props.type, t.x, t.y)
        if (last) {
          const el = await canvasService.drawLinkEnd(id)
          if (el) canvasCollabService.addElement(el)
        }

        return id
      },
    )

    onCleanup(() => {
      linkGesture.destroy()
    })
  })

  return (
    <LinkHandleDot
      style={{
        transform: `scale(${1 / zoom()}) translate(${coords()})`,
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
