import {beforeEach, expect, test, vi} from 'vitest'
import {mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {TreeService} from '@/services/TreeService'
import {Canvas, ElementType, File, State, createState} from '@/state'
import {Ctrl} from '@/services'

beforeEach(() => {
  vi.restoreAllMocks()
})

const createFile = (props: Partial<File> = {}) =>
  ({id: 'file_1', ydoc: new Uint8Array(), versions: [], ...props})

const ctrl = mockDeep<Ctrl>()

test('happy', () => {
  const files: File[] = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
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
  const service = new TreeService(ctrl, store, setState)

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

test('after - from top', () => {
  const files: File[] = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', parentId: 'file_1'}),
    createFile({id: 'file_3', parentId: 'file_1', leftId: 'file_2'}),
    createFile({id: 'file_4', parentId: 'file_1', leftId: 'file_3'}),
    createFile({id: 'file_5', parentId: 'file_1', leftId: 'file_4'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore<State>(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  service.after(service.tree[0].tree[0], service.tree[0].tree[2])
  console.log(service.tree[0].tree)
  // expect(service.tree[0].item.id).toBe('file_1')
  // expect(service.tree[0].tree[0].item.id).toBe('file_2')
})

test('deleted neighbor', () => {
  const files: File[] = [
    createFile({id: 'file_3', leftId: 'file_2'}),
    createFile({id: 'file_1'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[1].item.id).toBe('file_3')
})

test('deleted parent', () => {
  const files: File[] = [
    createFile({id: 'file_3', parentId: 'file_2'}),
    createFile({id: 'file_1'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expect(service.tree[0].item.id).toBe('file_1')
  // TODO:
  // expect(service.tree[1].item.id).toBe('file_3')
})

test('add new file', () => {
  const files: File[] = [
    createFile({id: 'file_1'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore<State>(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  const newFile = createFile({id: 'file_2'})
  setState('files', (prev) => [...prev, newFile])

  service.add({item: newFile, tree: []}, service.tree[0])
  expect(service.tree[0].item.id).toBe('file_1')
  expect(service.tree[0].tree[0].item.id).toBe('file_2')
})
