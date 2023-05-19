import {EdgeType} from '@/state'
import {Box2d, Vec2d} from '@tldraw/primitives'

export class ElementBox extends Box2d {
  constructor(
    public id: string,
    x = 0,
    y = 0,
    w = 0,
    h = 0
  ) {
    super(x, y, w, h)
  }
}

interface Result {
  id: string;
  edge: EdgeType;
}

export class ElementMap {
  constructor(private elements: ElementBox[]) {}

  near(point: [number, number]): Result | undefined {
    const p = Vec2d.FromArray(point)
    for (const box of this.elements) {
      const distT = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('top_left').addXY(1, 0),
        box.getHandlePoint('top_right').subXY(1, 0),
        p
      )
      const distB = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('bottom_left').addXY(1, 0),
        box.getHandlePoint('bottom_right').subXY(1, 0),
        p
      )
      const distL = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('top_left').addXY(0, 1),
        box.getHandlePoint('bottom_left').subXY(0, 1),
        p
      )
      const distR = Vec2d.DistanceToLineSegment(
        box.getHandlePoint('top_right').addXY(0, 1),
        box.getHandlePoint('bottom_right').subXY(0, 1),
        p
      )

      const corners = [
        {e: EdgeType.Top, d: distT},
        {e: EdgeType.Bottom, d: distB},
        {e: EdgeType.Left, d: distL},
        {e: EdgeType.Right, d: distR},
      ]

      let min
      for (const c of corners) {
        if (!min || c.d < min.d) min = c
      }

      if (min !== undefined && min.d <= 30) {
        return {id: box.id, edge: min.e}
      }
    }
  }

  center(): Vec2d | undefined {
    let all
    for (const el of this.elements) {
      if (!all) all = el
      else all.expand(el)
    }

    return all?.center
  }
}
