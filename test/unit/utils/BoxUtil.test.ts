import {Vector} from '@flatten-js/core'
import {expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {DB} from '@/db'
import {CornerType, EdgeType} from '@/state'
import {BoxUtil} from '@/utils/BoxUtil'
import {VecUtil} from '@/utils/VecUtil'

vi.mock('@/db', () => ({DB: mock<DB>()}))

test.each([
  [EdgeType.Left, VecUtil.fromArray([0, 100])],
  [EdgeType.Right, VecUtil.fromArray([100, 100])],
  [EdgeType.Top, VecUtil.fromArray([50, 0])],
  [EdgeType.Bottom, VecUtil.fromArray([50, 200])],
])('getHandlePoint', (edgeType, expected) => {
  const box = BoxUtil.fromRect({x: 0, y: 0, width: 100, height: 200})
  const point = BoxUtil.getHandlePoint(box, edgeType)

  expect(point).toEqual(expected)
})

test('fromLowToHigh', () => {
  const box = BoxUtil.fromLowHigh(VecUtil.fromArray([0, 0]), VecUtil.fromArray([100, 50]))

  expect(BoxUtil.toRect(box)).toEqual({x: 0, y: 0, width: 100, height: 50})
})

test('snapToGrid', () => {
  const box = BoxUtil.fromRect({x: 7, y: 12, width: 103, height: 57})
  const snapped = BoxUtil.snapToGrid(box, 10)
  expect(BoxUtil.toRect(snapped)).toEqual({x: 10, y: 10, width: 100, height: 60})
})

test.each([
  [EdgeType.Left, EdgeType.Right],
  [EdgeType.Right, EdgeType.Left],
  [EdgeType.Top, EdgeType.Bottom],
  [EdgeType.Bottom, EdgeType.Top],
  [CornerType.TopLeft, CornerType.BottomRight],
  [CornerType.TopRight, CornerType.BottomLeft],
  [CornerType.BottomLeft, CornerType.TopRight],
  [CornerType.BottomRight, CornerType.TopLeft],
])('getOppositeHandle', (handle, expected) => {
  expect(BoxUtil.getOppositeHandle(handle)).toBe(expected)
})

test('getOppositeHandle - invalid handle', () => {
  expect(() => BoxUtil.getOppositeHandle('foo' as EdgeType)).toThrowError()
})

test.each([
  // Resize edges without aspect ratio
  [EdgeType.Left, [20, 0], false, {x: 70, y: 50, width: 80, height: 100}],
  [EdgeType.Right, [20, 0], false, {x: 50, y: 50, width: 120, height: 100}],
  [EdgeType.Top, [0, 20], false, {x: 50, y: 70, width: 100, height: 80}],
  [EdgeType.Bottom, [0, 20], false, {x: 50, y: 50, width: 100, height: 120}],
  // Resize corners without aspect ratio
  [CornerType.BottomRight, [20, 30], false, {x: 50, y: 50, width: 120, height: 130}],
  [CornerType.BottomLeft, [-20, 30], false, {x: 30, y: 50, width: 120, height: 130}],
  [CornerType.TopRight, [20, -30], false, {x: 50, y: 20, width: 120, height: 130}],
  [CornerType.TopLeft, [-20, -30], false, {x: 30, y: 20, width: 120, height: 130}],
  // Resize with aspect ratio
  [CornerType.BottomRight, [20, 30], true, {x: 50, y: 50, width: 120, height: 120}],
])('resize', (handle, [mx, my], aspectRatio, expected) => {
  const box = BoxUtil.fromRect({x: 50, y: 50, width: 100, height: 100})

  const oppositeHandle = BoxUtil.getOppositeHandle(handle)
  const scalePoint = BoxUtil.getHandlePoint(box, oppositeHandle)
  const result = BoxUtil.resize(box, handle, mx, my, aspectRatio)
  const scale = new Vector(result.scaleX, result.scaleY)

  const low = new Vector(box.xmin, box.ymin)
    .subtract(scalePoint)
    .scale(scale.x, scale.y)
    .add(scalePoint)
  const high = new Vector(box.xmax, box.ymax)
    .subtract(scalePoint)
    .scale(scale.x, scale.y)
    .add(scalePoint)
  const resized = BoxUtil.fromLowHigh(low, high)

  expect(BoxUtil.toRect(resized)).toEqual(expected)
})
