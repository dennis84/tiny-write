import {expect, test} from 'vitest'
import {ElementBox, ElementMap} from '@/services/ElementMap'
import {EdgeType} from '@/state'

test('near', () => {
  const map = new ElementMap([
    new ElementBox('1', 0, 0, 100, 100),
    new ElementBox('2', 200, 200, 100, 100),
  ])

  expect(map.near([-10, -20])).toEqual({id: '1', edge: EdgeType.Top})
  expect(map.near([-20, -10])).toEqual({id: '1', edge: EdgeType.Left})
  expect(map.near([110, 120])).toEqual({id: '1', edge: EdgeType.Bottom})
  expect(map.near([120, 110])).toEqual({id: '1', edge: EdgeType.Right})

  expect(map.near([300, 180])).toEqual({id: '2', edge: EdgeType.Top})
})

test('center', () => {
  const map = new ElementMap([
    new ElementBox('1', 0, 0, 100, 100),
    new ElementBox('1', 100, 0, 100, 100),
    new ElementBox('1', 0, 100, 100, 100),
  ])

  expect(map.center()?.toArray()).toEqual([100, 100, 1])
})
