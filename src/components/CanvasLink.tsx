import {createEffect} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Canvas, CanvasEditorElement, CanvasLinkElement, useState} from '@/state'
import {Box2d} from '@tldraw/primitives'

const Link = styled('svg')`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-width: 50px;
  min-height: 50px;
  transform-origin: top left;
  overflow: visible;
`

const Path = styled('path')`
  stroke: transparent;
  stroke-width: 30;
  stroke-linecap: round;
  cursor: grab;
  ${(props: any) => props.selected ? `
    stroke: var(--foreground-20);
  ` : `
    &:hover {
      stroke: var(--foreground-10);
    }
  `}
`

const InnerPath = styled('path')`
  stroke: var(--primary-background);
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
`

export default ({element}: {element: CanvasLinkElement}) => {
  let pathRef!: SVGLineElement
  let innerPathRef!: SVGLineElement
  const [, ctrl] = useState()
  const currentCanvas = ctrl.canvas.currentCanvas
  if (!currentCanvas) return

  const onClick = () => {
    ctrl.canvas.select(element.id)
  }

  createEffect(() => {
    if (element.to === undefined && element.toX === undefined) {
      return
    }

    const p = getPath(currentCanvas, element)
    if (!p) return
    pathRef.setAttribute('d', p)
    innerPathRef.setAttribute('d', p)
  })

  return (
    <Link version="1.1" xmlns="http://www.w3.org/2000/svg">
      <Path ref={pathRef} onClick={onClick} selected={element.selected} />
      <InnerPath ref={innerPathRef} />
    </Link>
  )
}

const getPath = (canvas: Canvas, element: CanvasLinkElement): string | undefined => {
  const fromEl = canvas.elements.find((el) => el.id === element.from) as CanvasEditorElement

  if (!fromEl) return
  const fromBox = new Box2d(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
  const [x1, y1] = fromBox.getHandlePoint(element.fromEdge).toArray()
  let x2, y2

  if (element.toX !== undefined && element.toY !== undefined) {
    x2 = element.toX
    y2 = element.toY
  } else if (element.to && element.toEdge !== undefined) {
    const toEl = canvas.elements.find((el) => el.id === element.to) as CanvasEditorElement
    const toBox = new Box2d(toEl.x, toEl.y, toEl.width, toEl.height)
    ;[x2, y2] = toBox.getHandlePoint(element.toEdge).toArray()
  }

  return `M${x1},${y1}L${x2},${y2}`
}
