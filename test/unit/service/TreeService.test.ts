import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {TreeService} from '@/services/TreeService'
import {createState} from '@/state'
import {type Canvas, ElementType, type File} from '@/types'
import {expectTree} from '../testutil/tree'

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/db', () => ({DB: mock()}))

const createFile = (props: Partial<File> = {}): File => ({
  id: 'file_1',
  ydoc: new Uint8Array(),
  versions: [],
  ...props,
})

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: 'canvas_1',
  elements: [{id: 'file_1', type: ElementType.Editor}],
  camera: {point: [0, 0], zoom: 1},
  ...props,
})

test('init', () => {
  const initial = createState()
  const [store, setState] = createStore(initial)

  const service = new TreeService(store, setState)

  service.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
    createCanvas({id: 'canvas_5'}),
  ])

  expectTree(
    service.tree,
    `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=)
    └ file_3 (parentId=, leftId=)
    └ file_4 (parentId=, leftId=)
    └ canvas_5 (parentId=, leftId=)
    `,
  )
})

test('update', () => {
  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new TreeService(store, setState)

  service.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
    createCanvas({id: 'canvas_5'}),
  ])

  expectTree(
    service.tree,
    `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=)
    └ file_3 (parentId=, leftId=)
    └ file_4 (parentId=, leftId=)
    └ canvas_5 (parentId=, leftId=)
    `,
  )
})

test('collapse', async () => {
  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new TreeService(store, setState)

  service.reset([
    createFile({id: 'file_1'}), // 1
    createFile({id: 'file_2', parentId: 'file_1'}),
  ])

  expectTree(
    service.tree,
    `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
    `,
  )

  await service.collapse('file_1')

  expect(store.tree?.collapsed).toEqual(['file_1'])
  expect(service.isCollapsed('file_1')).toBe(true)

  await service.collapse('file_1')

  expect(store.tree?.collapsed).toEqual([])
  expect(service.isCollapsed('file_1')).toBe(false)
})
