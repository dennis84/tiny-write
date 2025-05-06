import {Box, Point, Vector} from '@flatten-js/core'
import {CanvasPoint} from '@/state'

export class VecUtil {
  static center(box: Box): Vector {
    return VecUtil.fromPoint(box.center)
  }

  static fromPoint(point: Point): Vector {
    return new Vector(point.x, point.y)
  }

  static fromArray(point: CanvasPoint): Vector {
    return new Vector(point[0], point[1])
  }

  static snapToGrid(vec: Vector, size: number) {
    return new Vector(Math.round(vec.x / size) * size, Math.round(vec.y / size) * size)
  }

  static lrp(a: Vector, b: Vector, t: number) {
    return new Vector((a.x = a.x + (b.x - a.x) * t), (a.y = a.y + (b.y - a.y) * t))
  }

  static rotate(v: Vector, r: number, center: Vector) {
    if (r === 0) return v
    const x = v.x - center.x
    const y = v.y - center.y
    const s = Math.sin(r)
    const c = Math.cos(r)
    return new Vector(center.x + (x * c - y * s), center.y + (x * s + y * c))
  }
}
