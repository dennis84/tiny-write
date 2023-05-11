import {EdgeType} from '@/state'
import Vec from '@tldraw/vec';

interface Element {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Result {
  id: string;
  edge: EdgeType;
}

export class ElementMap {
  constructor(private elements: Element[]) {}

  near(p: [number, number]): Result | undefined {
    for (const {id, x, y, w, h} of this.elements) {
      const distT = Vec.distanceToLineSegment([x + 1, y], [x + w - 1, y], p)
      const distB = Vec.distanceToLineSegment([x + 1, y + h], [x + w - 1, y + h], p)
      const distL = Vec.distanceToLineSegment([x, y + 1], [x, y + h -1], p)
      const distR = Vec.distanceToLineSegment([x + w, y + 1], [x + w, y + h -1], p)

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

      if (min !== undefined && min.d < 20) {
        return {id, edge: min.e}
      }
    }
  }
}
