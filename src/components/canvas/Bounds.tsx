import {Show, createEffect, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {type Box, Vector} from '@flatten-js/core'
import {CornerType, EdgeType, useState} from '@/state'
import type {Selection} from '@/services/CanvasService'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {BoxUtil} from '@/utils/BoxUtil'
import {VecUtil} from '@/utils/VecUtil'

interface BoundsProps {
  selection: Selection
  selected?: boolean
  visible?: boolean
  index: number
  onSelect?: (e: MouseEvent) => void
  onDoubleClick?: () => void
}

interface EdgeProps extends BoundsProps {
  type: EdgeType
}

interface CornerProps extends BoundsProps {
  type: CornerType
}

const BORDER_SIZE = 30
const BORDER_SIZE_2 = BORDER_SIZE * 2

const Border = styled('rect')`
  fill: transparent;
  cursor: ${(props: any) => (props.vert ? 'ns-resize' : 'ew-resize')};
  touch-action: none;
`

const resizeElements = (
  selection: Selection,
  handle: EdgeType | CornerType,
  mx: number,
  my: number,
  shiftKey = false,
  snapToGrid = false,
): [string, Box][] => {
  const oppositeHandle = BoxUtil.getOppositeHandle(handle)
  const scalePoint = BoxUtil.getHandlePoint(selection.box, oppositeHandle)
  const result = BoxUtil.resize(selection.box, handle, mx, my, shiftKey)
  const scale = new Vector(result.scaleX, result.scaleY)

  return selection.elements.map(([id, element]) => {
    let {xmin, ymin, xmax, ymax} = element
    const flipX = scale.x < 0
    const flipY = scale.y < 0
    if (flipX) {
      const t = xmax
      xmax = xmin
      xmin = t
    }
    if (flipY) {
      const t = ymax
      ymax = ymin
      ymin = t
    }

    const low = new Vector(xmin, ymin).subtract(scalePoint).scale(scale.x, scale.y).add(scalePoint)
    const heigh = new Vector(xmax, ymax)
      .subtract(scalePoint)
      .scale(scale.x, scale.y)
      .add(scalePoint)
    const box = BoxUtil.fromLowHigh(low, heigh)
    if (snapToGrid) BoxUtil.snapToGrid(box, 10)
    return [id, box]
  })
}

const Edge = (props: EdgeProps) => {
  const {canvasService, canvasCollabService} = useState()

  const vert = props.type === EdgeType.Top || props.type === EdgeType.Bottom
  let ref!: SVGRectElement

  onMount(() => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const resizeGesture = new DragGesture(
      ref,
      ({event, movement: [mx, my], memo, first, shiftKey}) => {
        event.stopPropagation()

        const selection: Selection = first ? props.selection : memo
        const {zoom} = currentCanvas.camera

        resizeElements(
          selection,
          props.type,
          mx / zoom,
          my / zoom,
          shiftKey,
          currentCanvas.snapToGrid,
        ).forEach(([id, box]) => {
          const rect = BoxUtil.toRect(box)
          void canvasCollabService.updateElementThrottled({id, ...rect})
          canvasService.updateCanvasElement(id, rect)
        })

        canvasService.updateCanvas(currentCanvas.id, {lastModified: new Date()})
        void canvasService.saveCanvasThrottled()
        return selection
      },
    )

    onCleanup(() => {
      resizeGesture.destroy()
    })
  })

  createEffect(() => {
    const rw = vert ? props.selection.box.width + BORDER_SIZE_2 : BORDER_SIZE
    const rh = vert ? BORDER_SIZE : props.selection.box.height + BORDER_SIZE_2
    const rx = props.type === EdgeType.Right ? props.selection.box.width + BORDER_SIZE : 0
    const ry = props.type === EdgeType.Bottom ? props.selection.box.height + BORDER_SIZE : 0
    ref.setAttribute('x', rx.toString())
    ref.setAttribute('y', ry.toString())
    ref.setAttribute('width', rw.toString())
    ref.setAttribute('height', rh.toString())
  })

  return <Border ref={ref} vert={vert} data-testid={`edge_${props.type}`} />
}

const Corner = (props: CornerProps) => {
  let ref!: SVGRectElement
  const {canvasService, canvasCollabService} = useState()
  const left = props.type === CornerType.TopLeft || props.type === CornerType.BottomLeft
  const bottom = props.type === CornerType.BottomLeft || props.type === CornerType.BottomRight
  const cursor =
    props.type === CornerType.TopLeft
      ? 'nwse-resize'
      : props.type === CornerType.TopRight
        ? 'nesw-resize'
        : props.type === CornerType.BottomLeft
          ? 'nesw-resize'
          : props.type === CornerType.BottomRight
            ? 'nwse-resize'
            : ''

  onMount(() => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const gesture = new DragGesture(ref, ({event, movement: [mx, my], shiftKey, memo, first}) => {
      event.stopPropagation()
      const selection: Selection = first ? props.selection : memo
      const {zoom} = currentCanvas.camera

      resizeElements(
        selection,
        props.type,
        mx / zoom,
        my / zoom,
        shiftKey,
        currentCanvas.snapToGrid,
      ).forEach(([id, box]) => {
        const rect = BoxUtil.toRect(box)
        void canvasCollabService.updateElementThrottled({id, ...rect})
        canvasService.updateCanvasElement(id, rect)
      })

      canvasService.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      void canvasService.saveCanvasThrottled()
      return selection
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  createEffect(() => {
    const ex = left ? 0 : props.selection.box.width + BORDER_SIZE
    const ey = bottom ? props.selection.box.height + BORDER_SIZE : 0
    ref.setAttribute('x', ex.toString())
    ref.setAttribute('y', ey.toString())
  })

  return (
    <rect
      ref={ref}
      width={BORDER_SIZE}
      height={BORDER_SIZE}
      style={{cursor, fill: 'transparent', 'touch-action': 'none'}}
      data-testid={`corner_${props.type}`}
    />
  )
}

const BoundsSvg = styled('svg')`
  position: absolute;
  cursor: var(--cursor-grab);
  touch-action: none;
  &:active {
    cursor: var(--cursor-grabbed);
  }
`

export const Bounds = (props: BoundsProps) => {
  let ref!: SVGSVGElement
  const [local, others] = splitProps(props, ['onSelect', 'onDoubleClick'])
  const {canvasService, canvasCollabService} = useState()
  const currentCanvas = canvasService.currentCanvas
  if (!currentCanvas) return

  onMount(() => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const gesture = new DragGesture(ref, ({event, first, last, movement: [mx, my], memo}) => {
      event.stopPropagation()

      const selection: Selection = first ? props.selection : memo
      const {zoom} = currentCanvas.camera

      selection.elements.forEach(([id, initial]) => {
        const t = new Vector(mx, my).multiply(1 / zoom).add(VecUtil.fromPoint(initial.low))
        if (currentCanvas.snapToGrid) VecUtil.snapToGrid(t, 10)
        const {x, y} = t

        void canvasCollabService.updateElementThrottled({id, x, y})
        canvasService.updateCanvasElement(id, {x, y})
      })

      canvasService.updateCanvas(currentCanvas.id, {lastModified: new Date()})
      void canvasService.saveCanvasThrottled()
      canvasService.setMoving(!last)
      return selection
    })

    onCleanup(() => {
      gesture.destroy()
    })
  })

  return (
    <BoundsSvg
      {...others}
      ref={ref}
      style={{
        'z-index': ZIndex.element(props.index, IndexType.BOUNDS),
        width: `${Number(props.selection.box.width) + BORDER_SIZE_2}px`,
        height: `${Number(props.selection.box.height) + BORDER_SIZE_2}px`,
        left: `${Number(props.selection.box.xmin) - BORDER_SIZE}px`,
        top: `${Number(props.selection.box.ymin) - BORDER_SIZE}px`,
      }}
      onMouseDown={local.onSelect}
      onDblClick={local.onDoubleClick}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Edge {...others} type={EdgeType.Top} />
      <Edge {...others} type={EdgeType.Right} />
      <Edge {...others} type={EdgeType.Bottom} />
      <Edge {...others} type={EdgeType.Left} />
      <Corner {...others} type={CornerType.TopLeft} />
      <Corner {...others} type={CornerType.TopRight} />
      <Corner {...others} type={CornerType.BottomLeft} />
      <Corner {...others} type={CornerType.BottomRight} />
      <Show when={others.selected && props.visible}>
        <Visible {...props} />
      </Show>
    </BoundsSvg>
  )
}

const Visible = (props: BoundsProps) => {
  const STROKE_WIDTH = 2
  const RECT_WIDTH = 10
  const {canvasService} = useState()

  const zoom = () => canvasService.currentCanvas?.camera.zoom ?? 1

  const VisibleCorner = styled('rect')`
    fill: var(--background);
    stroke: var(--primary-background);
    pointer-events: none;
    user-select: none;
  `

  const VisibleBorder = styled('rect')`
    fill: none;
    stroke: var(--primary-background);
    pointer-events: none;
    user-select: none;
  `

  return (
    <>
      <VisibleBorder
        x={BORDER_SIZE}
        y={BORDER_SIZE}
        width={props.selection.box.width}
        height={props.selection.box.height}
        style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
      />
      <VisibleCorner
        x={BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        y={BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        width={RECT_WIDTH / zoom()}
        height={RECT_WIDTH / zoom()}
        style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
      />
      <VisibleCorner
        x={props.selection.box.width + BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        y={BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        width={RECT_WIDTH / zoom()}
        height={RECT_WIDTH / zoom()}
        style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
      />
      <VisibleCorner
        x={BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        y={props.selection.box.height + BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        width={RECT_WIDTH / zoom()}
        height={RECT_WIDTH / zoom()}
        style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
      />
      <VisibleCorner
        x={props.selection.box.width + BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        y={props.selection.box.height + BORDER_SIZE - RECT_WIDTH / 2 / zoom()}
        width={RECT_WIDTH / zoom()}
        height={RECT_WIDTH / zoom()}
        style={{'stroke-width': (STROKE_WIDTH / zoom()).toString()}}
      />
    </>
  )
}
