import {createEffect} from 'solid-js'
import {styled} from 'solid-styled-components'
import {CanvasEditorElement, CanvasLinkElement, useState} from '@/state'
import {Box2d} from '@tldraw/primitives'

const Line = styled('svg')`
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

export default ({element}: {element: CanvasLinkElement}) => {
  let ref!: SVGLineElement
  const [, ctrl] = useState()
  const currentCanvas = ctrl.canvas.currentCanvas
  if (!currentCanvas) return
  const fromEl = currentCanvas.elements.find((el) => el.id === element.from) as CanvasEditorElement
  if (!fromEl) return

  createEffect(() => {
    if (element.to === undefined && element.toX === undefined) {
      return
    }

    const fromBox = new Box2d(fromEl.x, fromEl.y, fromEl.width, fromEl.height)
    const [x1, y1] = fromBox.getHandlePoint(element.fromEdge).toArray()
    ref.setAttribute('x1', String(x1))
    ref.setAttribute('y1', String(y1))

    if (element.toX !== undefined && element.toY !== undefined) {
      ref.setAttribute('x2', String(element.toX))
      ref.setAttribute('y2', String(element.toY))
    } else if (element.to && element.toEdge !== undefined) {
      const toEl = currentCanvas.elements.find((el) => el.id === element.to) as CanvasEditorElement
      const toBox = new Box2d(toEl.x, toEl.y, toEl.width, toEl.height)
      const [x2, y2] = toBox.getHandlePoint(element.toEdge).toArray()
      ref.setAttribute('x2', String(x2))
      ref.setAttribute('y2', String(y2))
    }
  })

  return (
    <Line
      data-testid="canvas-link"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        ref={ref}
        stroke="var(--primary-background-50)"
        stroke-width="2"
        stroke-linecap="round"
      />
    </Line>
  )
}
