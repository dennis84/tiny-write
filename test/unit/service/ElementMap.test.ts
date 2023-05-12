import {test} from 'vitest'
import {ElementBox, ElementMap} from '@/services/ElementMap'

test('near', () => {
  const map = new ElementMap([
    new ElementBox('1', 0, 0, 100, 100),
  ])

  const p: [number, number] = [-10, -20]
  console.log(`Test: ${p}, expect: edge=left`)
  console.log(map.near(p))
})
