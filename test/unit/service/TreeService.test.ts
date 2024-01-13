import {beforeEach, expect, test, vi} from 'vitest'
import {createStore} from 'solid-js/store'
import {TreeService} from '@/services/TreeService'
import {Canvas, ElementType, File, createState} from '@/state'

beforeEach(() => {
  vi.restoreAllMocks()
})

test('create', () => {
  const ydoc = new Uint8Array()

  const files: File[] = [
    {id: 'file_1', ydoc, versions: []},
    {id: 'file_2', ydoc, versions: []},
    {id: 'file_3', ydoc, versions: []},
    {id: 'file_4', ydoc, versions: []},
  ]

  const canvases: Canvas[] = [
    {
      id: 'canvas_5',
      elements: [{id: 'file_3', type: ElementType.Editor}],
      camera: {point: [0, 0], zoom: 1}
    },
  ]

  const initial = createState({files, canvases})
  const [store, setState] = createStore(initial)
  const service = new TreeService(store, setState)

  // - F1
  // - F2
  // - F3
  // - F4
  // - C5
  service.create()
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[1].item.id).toBe('file_2')
  expect(service.tree[2].item.id).toBe('file_3')
  expect(service.tree[3].item.id).toBe('file_4')
  expect(service.tree[4].item.id).toBe('canvas_5')

  // - F1
  //   - F2 (parentId=F1)
  // - F3
  // - F4
  // - C5
  service.add(service.tree[1], service.tree[0])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].tree[0].item.id).toBe('file_2')
  expect(service.tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[1].item.id).toBe('file_3')
  expect(service.tree[2].item.id).toBe('file_4')
  expect(service.tree[3].item.id).toBe('canvas_5')

  // - F1
  //   - F2 (parentId=F1)
  //   - F3 (parentId=F1, leftId=F2)
  // - F4
  // - C5
  service.add(service.tree[1], service.tree[0])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].tree[0].item.id).toBe('file_2')
  expect(service.tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[1].item.id).toBe('file_3')
  expect(service.tree[0].tree[1].item.leftId).toBe('file_2')
  expect(service.tree[1].item.id).toBe('file_4')
  expect(service.tree[2].item.id).toBe('canvas_5')

  // - F1
  //   - F2 (parentId=F1)
  //   - F4 (parentId=F1, leftId=F2)
  //   - F3 (parentId=F1, leftId=F4)
  // - C5
  service.before(service.tree[1], service.tree[0].tree[1])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].tree[0].item.id).toBe('file_2')
  expect(service.tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[1].item.id).toBe('file_4')
  expect(service.tree[0].tree[1].item.leftId).toBe('file_2')
  expect(service.tree[0].tree[2].item.id).toBe('file_3')
  expect(service.tree[0].tree[2].item.leftId).toBe('file_4')
  expect(service.tree[1].item.id).toBe('canvas_5')

  // - F1
  //   - F2 (parentId=F1)
  //   - F4 (parentId=F1, leftId=F2)
  //   - C5 (parentId=F1, leftId=F4)
  //   - F3 (parentId=F1, leftId=C5)
  service.before(service.tree[1], service.tree[0].tree[2])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].tree[0].item.id).toBe('file_2')
  expect(service.tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[1].item.id).toBe('file_4')
  expect(service.tree[0].tree[1].item.leftId).toBe('file_2')
  expect(service.tree[0].tree[2].item.id).toBe('canvas_5')
  expect(service.tree[0].tree[2].item.leftId).toBe('file_4')
  expect(service.tree[0].tree[3].item.id).toBe('file_3')
  expect(service.tree[0].tree[3].item.leftId).toBe('canvas_5')

  // - F1
  //   - F2 (parentId=F1)
  //     - F4 (parentId=F1, leftId=F2)
  //   - C5 (parentId=F1, leftId=F4)
  //   - F3 (parentId=F1, leftId=C5)
  service.add(service.tree[0].tree[1], service.tree[0].tree[0])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].tree[0].item.id).toBe('file_2')
  expect(service.tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[0].tree[0].item.id).toBe('file_4')
  expect(service.tree[0].tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[1].item.id).toBe('canvas_5')
  expect(service.tree[0].tree[1].item.leftId).toBe('file_2')
  expect(service.tree[0].tree[2].item.id).toBe('file_3')
  expect(service.tree[0].tree[2].item.leftId).toBe('canvas_5')

  // - F1
  //   - C5 (parentId=F1, leftId=F4)
  //   - F3 (parentId=F1, leftId=C5)
  // - F2 (parentId=F1)
  //   - F4 (parentId=F1, leftId=F2)
  service.after(service.tree[0].tree[0], service.tree[0])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[0].item.id).toBe('canvas_5')
  expect(service.tree[0].tree[0].item.leftId).toBe(undefined)
  expect(service.tree[0].tree[1].item.id).toBe('file_3')
  expect(service.tree[0].tree[1].item.leftId).toBe('canvas_5')
  expect(service.tree[1].item.id).toBe('file_2')
  expect(service.tree[1].item.leftId).toBe('file_1')
  expect(service.tree[1].tree[0].item.id).toBe('file_4')
  expect(service.tree[1].tree[0].item.leftId).toBe(undefined)
})
