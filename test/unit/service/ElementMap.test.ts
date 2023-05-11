import {test} from 'vitest'
import {ElementMap} from '@/services/ElementMap'

test('near', () => {
  const map = new ElementMap([
    {id: '1', x: 0, y: 0, w: 100, h: 100},
  ])

  const p: [number, number] = [-10, -20]
  console.log(`Test: ${p}, expect: edge=left`)
  console.log(map.near(p))
})
