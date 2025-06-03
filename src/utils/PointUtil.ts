import {Point, type Vector} from '@flatten-js/core'

export class PointUtil {
  static fromVec({x, y}: Vector): Point {
    return new Point(x, y)
  }
}
