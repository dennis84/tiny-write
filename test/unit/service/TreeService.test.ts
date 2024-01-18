import {beforeEach, expect, test, vi} from 'vitest'
import {mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {TreeNode, TreeService} from '@/services/TreeService'
import {Canvas, ElementType, File, State, createState} from '@/state'
import {Ctrl} from '@/services'

beforeEach(() => {
  vi.restoreAllMocks()
})

const createFile = (props: Partial<File> = {}): File =>
  ({id: 'file_1', ydoc: new Uint8Array(), versions: [], ...props})

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: 'canvas_1',
  elements: [{id: 'file_1', type: ElementType.Editor}],
  camera: {point: [0, 0], zoom: 1},
  ...props,
})

const ctrl = mockDeep<Ctrl>()

test('init - flat', () => {
  const files = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
  ]

  const canvases = [
    createCanvas({id: 'canvas_5'}),
  ]

  const initial = createState({files, canvases})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=file_1)
    └ file_3 (parentId=, leftId=file_2)
    └ file_4 (parentId=, leftId=file_3)
    └ canvas_5 (parentId=, leftId=file_4)
  `)
})

test('add', () => {
  const files = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=file_1)
    └ file_3 (parentId=, leftId=file_2)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.add(service.tree[1], service.tree[0])
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
    └ file_3 (parentId=, leftId=file_1)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.add(service.tree[1], service.tree[0])
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
      └ file_3 (parentId=file_1, leftId=file_2)
    └ file_4 (parentId=, leftId=file_1)
  `)
})

test('add - new file', () => {
  const files: File[] = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', parentId: 'file_1'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore<State>(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  const newFile = createFile({id: 'file_3'})
  setState('files', (prev) => [...prev, newFile])

  service.add({item: newFile, tree: []}, service.tree[0])
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
      └ file_3 (parentId=file_1, leftId=file_2)
  `)
})

test('before - same tree', () => {
  const files = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=file_1)
    └ file_3 (parentId=, leftId=file_2)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.before(service.tree[0], service.tree[2])
  expectTree(service.tree, `
    └ file_2 (parentId=, leftId=)
    └ file_1 (parentId=, leftId=file_2)
    └ file_3 (parentId=, leftId=file_1)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.before(service.tree[2], service.tree[0])
  expectTree(service.tree, `
    └ file_3 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=file_3)
    └ file_1 (parentId=, leftId=file_2)
    └ file_4 (parentId=, leftId=file_1)
  `)
})

test('before - from other tree', () => {
  const files = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', parentId: 'file_1'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
    └ file_3 (parentId=, leftId=file_1)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.before(service.tree[1], service.tree[0].tree[0])
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_3 (parentId=file_1, leftId=)
      └ file_2 (parentId=file_1, leftId=file_3)
    └ file_4 (parentId=, leftId=file_1)
  `)
})

test('after - same tree', () => {
  const files = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=file_1)
    └ file_3 (parentId=, leftId=file_2)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.after(service.tree[0], service.tree[2])
  expectTree(service.tree, `
    └ file_2 (parentId=, leftId=)
    └ file_3 (parentId=, leftId=file_2)
    └ file_1 (parentId=, leftId=file_3)
    └ file_4 (parentId=, leftId=file_1)
  `)

  service.after(service.tree[2], service.tree[0])
  expectTree(service.tree, `
    └ file_2 (parentId=, leftId=)
    └ file_1 (parentId=, leftId=file_2)
    └ file_3 (parentId=, leftId=file_1)
    └ file_4 (parentId=, leftId=file_3)
  `)
})

test('after - from other tree', () => {
  const files = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', parentId: 'file_1'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
    └ file_3 (parentId=, leftId=file_1)
    └ file_4 (parentId=, leftId=file_3)
  `)

  service.after(service.tree[1], service.tree[0].tree[0])
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
      └ file_3 (parentId=file_1, leftId=file_2)
    └ file_4 (parentId=, leftId=file_1)
  `)
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
  expectTree(service.tree, `
    └ file_1 (parentId=, leftId=)
    └ file_3 (parentId=, leftId=file_1)
  `)
})

test('deleted parent', () => {
  const files: File[] = [
    createFile({id: 'file_1'}),
    createFile({id: 'file_3', parentId: 'file_2'}),
  ]

  const initial = createState({files})
  const [store, setState] = createStore(initial)
  const service = new TreeService(ctrl, store, setState)

  service.create()
  // TODO:
  // expectTree(service.tree, `
  //   └ file_1 (parentId=, leftId=)
  //   └ file_3 (parentId=, leftId=file_2)
  // `)
})

function expectTree(tree: TreeNode[], str: string) {
  const result = printTree(tree).split('\n')
  let i = 0
  for (const line of str.split('\n')) {
    if (!line) continue
    const l = line.substring(4)
    expect(result[i]).toBe(l)
    i++
  }
}

function printTree(tree: TreeNode[], level = 0) {
  let out = ''
  for (const n of tree) {
    const indent = '  '.repeat(level)
    const id = n.item.id
    const parentId = n.item.parentId ?? ''
    const leftId = n.item.leftId ?? ''
    out += `${indent}└ ${id} (parentId=${parentId}, leftId=${leftId})\n`
    out += printTree(n.tree, level+1)
  }

  return out
}
