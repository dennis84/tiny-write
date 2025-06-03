import {Box, type Segment, Vector} from '@flatten-js/core'
import {type CanvasRect, CornerType, EdgeType} from '@/state'
import {VecUtil} from './VecUtil'

export class BoxUtil {
  static getSegment(box: Box, edgeType: EdgeType): Segment {
    const [t, r, b, l] = box.toSegments()
    switch (edgeType) {
      case EdgeType.Top:
        return t
      case EdgeType.Right:
        return r
      case EdgeType.Bottom:
        return b
      case EdgeType.Left:
        return l
    }
  }

  static getHandlePoint(box: Box, edgeType: EdgeType | CornerType): Vector {
    if (edgeType === CornerType.TopLeft) return new Vector(box.xmin, box.ymin)
    if (edgeType === CornerType.TopRight) return new Vector(box.xmax, box.ymin)
    if (edgeType === CornerType.BottomLeft) return new Vector(box.xmin, box.ymax)
    if (edgeType === CornerType.BottomRight) return new Vector(box.xmax, box.ymax)
    return VecUtil.fromPoint(BoxUtil.getSegment(box, edgeType).middle())
  }

  static fromRect({x, y, width, height}: CanvasRect): Box {
    return new Box(x, y, x + width, y + height)
  }

  static toRect(box: Box): CanvasRect {
    return {
      x: box.xmin,
      y: box.ymin,
      width: box.width,
      height: box.height,
    }
  }

  static fromLowHigh(low: Vector, high: Vector): Box {
    return new Box(low.x, low.y, high.x, high.y)
  }

  static snapToGrid(box: Box, size: number) {
    return new Box(
      Math.round(box.xmin / size) * size,
      Math.round(box.ymin / size) * size,
      Math.round(box.xmax / size) * size,
      Math.round(box.ymax / size) * size,
    )
  }

  static getOppositeHandle(handle: EdgeType | CornerType): EdgeType | CornerType {
    if (handle === EdgeType.Top) return EdgeType.Bottom
    if (handle === EdgeType.Bottom) return EdgeType.Top
    if (handle === EdgeType.Left) return EdgeType.Right
    if (handle === EdgeType.Right) return EdgeType.Left
    if (handle === CornerType.TopLeft) return CornerType.BottomRight
    if (handle === CornerType.TopRight) return CornerType.BottomLeft
    if (handle === CornerType.BottomLeft) return CornerType.TopRight
    if (handle === CornerType.BottomRight) return CornerType.TopLeft

    throw new Error(`Unexpeced handle type (handle=${handle})`)
  }

  static resize(
    box: Box,
    handle: EdgeType | CornerType,
    mx: number,
    my: number,
    aspectRatio: boolean = false,
  ) {
    const newBox = box.clone()

    switch (handle) {
      case EdgeType.Left:
      case CornerType.TopLeft:
      case CornerType.BottomLeft: {
        newBox.xmin += mx
        break
      }
      case EdgeType.Right:
      case CornerType.TopRight:
      case CornerType.BottomRight: {
        newBox.xmax += mx
        break
      }
    }
    switch (handle) {
      case EdgeType.Top:
      case CornerType.TopLeft:
      case CornerType.TopRight: {
        newBox.ymin += my
        break
      }
      case EdgeType.Bottom:
      case CornerType.BottomLeft:
      case CornerType.BottomRight: {
        newBox.ymax += my
        break
      }
    }

    let scaleX = (newBox.xmax - newBox.xmin) / (box.xmax - box.xmin)
    let scaleY = (newBox.ymax - newBox.ymin) / (box.ymax - box.ymin)

    if (aspectRatio) {
      scaleX = Math.min(scaleX, scaleY)
      scaleY = Math.min(scaleX, scaleY)
    }

    return {scaleX, scaleY}
  }
}
