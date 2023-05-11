import {createEffect} from 'solid-js'
import {styled} from 'solid-styled-components'
import {CanvasEditorElement, CanvasLinkElement, EdgeType, useState} from '@/state'

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

    switch (element.fromEdge) {
    case EdgeType.Top:
      ref.setAttribute('x1', String(fromEl.x + (fromEl.width / 2)))
      ref.setAttribute('y1', String(fromEl.y))
      break
    case EdgeType.Bottom:
      ref.setAttribute('x1', String(fromEl.x + (fromEl.width / 2)))
      ref.setAttribute('y1', String(fromEl.y + fromEl.height))
      break
    case EdgeType.Left:
      ref.setAttribute('x1', String(fromEl.x))
      ref.setAttribute('y1', String(fromEl.y + fromEl.height / 2))
      break
    case EdgeType.Right:
      ref.setAttribute('x1', String(fromEl.x + fromEl.width))
      ref.setAttribute('y1', String(fromEl.y + fromEl.height / 2))
      break
    }

    if (element.toX !== undefined && element.toY !== undefined) {
      ref.setAttribute('x2', String(element.toX))
      ref.setAttribute('y2', String(element.toY))
    } else if (element.to && element.toEdge !== undefined) {
      const toEl = currentCanvas.elements.find((el) => el.id === element.to) as CanvasEditorElement
      switch (element.toEdge) {
      case EdgeType.Top:
        ref.setAttribute('x2', String(toEl.x + (toEl.width / 2)))
        ref.setAttribute('y2', String(toEl.y))
        break
      case EdgeType.Bottom:
        ref.setAttribute('x2', String(toEl.x + (toEl.width / 2)))
        ref.setAttribute('y2', String(toEl.y + toEl.height))
        break
      case EdgeType.Left:
        ref.setAttribute('x2', String(toEl.x))
        ref.setAttribute('y2', String(toEl.y + (toEl.height / 2)))
        break
      case EdgeType.Right:
        ref.setAttribute('x2', String(toEl.x + toEl.width))
        ref.setAttribute('y2', String(toEl.y + (toEl.height / 2)))
        break
      }
    }
  })

  return (
    <Line
      data-testid="canvas-link"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg">
      <line
        ref={ref}
        stroke="var(--primary-background-50)"
        stroke-width="2"
        stroke-linecap="round"
      />
    </Line>
  )
}
