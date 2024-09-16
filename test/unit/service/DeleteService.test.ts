import {vi, test, expect, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {CanvasService} from '@/services/CanvasService'
import {DeleteService} from '@/services/DeleteService'
import {FileService} from '@/services/FileService'
import {TreeService} from '@/services/TreeService'
import {
  CanvasEditorElement,
  CanvasLinkElement,
  createState,
  EdgeType,
  ElementType,
  File,
} from '@/state'
import {DB} from '@/db'
import {createYUpdate} from '../util/prosemirror-util'

vi.mock('@/db', () => ({DB: mock()}))

const lastModified = new Date()

const createFile = (props: Partial<File>): File => ({
  id: props.id ?? '',
  ydoc: createYUpdate(props.id ?? '', []),
  versions: [],
  lastModified,
  ...props,
})

const createEditorElement = (props: Partial<CanvasEditorElement>) => ({
  id: '1',
  type: ElementType.Editor,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...props,
})

const createLinkElement = (props: Partial<CanvasLinkElement> = {}) => ({
  id: '1',
  type: ElementType.Link,
  from: '1',
  fromEdge: EdgeType.Left,
  to: '2',
  toEdge: EdgeType.Right,
  ...props,
})

const initial = createState({
  args: {file: './file.txt', cwd: '/home'},
  files: [
    createFile({id: '1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
  ],
  canvases: [
    {
      id: '1',
      camera: {point: [0, 0], zoom: 1},
      elements: [
        createEditorElement({id: '1'}),
        createEditorElement({id: '2'}),
        createLinkElement({id: '3', from: '1', to: '2'}),
      ],
      active: false,
      lastModified: new Date(),
    },
  ],
})

beforeEach(() => {
  vi.restoreAllMocks()
})

test.each([
  {
    node: initial.files[2],
    current: initial.files[2],
    navigateTo: '/code/2',
    fileUpdated: true,
  },
  {
    node: initial.files[1],
    current: initial.files[1],
    navigateTo: '/editor/1',
  },
  {
    node: initial.files[1],
    current: initial.files[2],
    descendant: true,
    navigateTo: '/editor/1',
  },
  {
    node: initial.files[0],
    current: initial.files[0],
    navigateTo: '/',
  },
])('delete - soft %#', async (data) => {
  const fileService = mock<FileService>()
  const canvasService = mock<CanvasService>()
  const treeService = mock<TreeService>()

  const [store, setState] = createStore(initial)
  const service = new DeleteService(fileService, canvasService, treeService, store, setState)

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(data.current)})
  fileService.findFileById.mockReturnValue(initial.files.find((f) => f.id === data.node.parentId))
  treeService.isDescendant.mockReturnValue(data.descendant ?? false)

  const node = {
    item: data.node,
    tree: [],
  }

  const result = await service.delete(node)

  expect(result.navigateTo).toBe(data.navigateTo)

  expect(fileService.updateFile).toBeCalled()

  expect(store.args?.cwd).toBeDefined()
  expect(store.args?.file).toBe(undefined)
})

test.each([
  {
    node: initial.files[2],
    current: initial.files[2],
    navigateTo: '/code/2',
    expectedFiles: 2,
    expectedElements: 3,
  },
  {
    node: initial.files[1],
    current: initial.files[1],
    navigateTo: '/editor/1',
    expectedFiles: 1,
    expectedElements: 1,
  },
  {
    node: initial.files[1],
    current: initial.files[2],
    descendant: true,
    navigateTo: '/editor/1',
    expectedFiles: 1,
    expectedElements: 1,
  },
  {
    node: initial.files[0],
    current: initial.files[0],
    navigateTo: '/',
    expectedFiles: 0,
    expectedElements: 0,
  },
])('delete - forever %#', async (data) => {
  const fileService = mock<FileService>()
  const canvasService = mock<CanvasService>()
  const treeService = mock<TreeService>()

  const [store, setState] = createStore(initial)
  const service = new DeleteService(fileService, canvasService, treeService, store, setState)

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(data.current)})
  fileService.findFileById.mockReturnValue(initial.files.find((f) => f.id === data.node.parentId))
  treeService.isDescendant.mockReturnValue(data.descendant ?? false)

  const node = {
    item: data.node,
    tree: [],
  }

  const result = await service.delete(node, true)

  expect(result.navigateTo).toBe(data.navigateTo)
  expect(store.files.length).toBe(data.expectedFiles)
  expect(store.canvases[0].elements.length).toBe(data.expectedElements)
  expect(DB.deleteFile).toBeCalled()
})

test('emptyBin', async () => {
  const fileService = mock<FileService>()
  const canvasService = mock<CanvasService>()

  const initial = createState({
    files: [
      createFile({id: '1', deleted: true}),
      createFile({id: '2', parentId: '1'}),
      createFile({id: '3', parentId: '2', deleted: true}),
      createFile({id: '4', deleted: true}),
      createFile({id: '5', parentId: '4', deleted: true}),
    ],
  })

  Object.defineProperty(fileService, 'currentFile', {
    get: vi.fn().mockReturnValue(initial.files[2]),
  })
  fileService.findFileById.mockReturnValue(initial.files[1])

  const [store, setState] = createStore(initial)

  const treeService = new TreeService(store, setState)
  treeService.create()

  const service = new DeleteService(fileService, canvasService, treeService, store, setState)

  const result = await service.emptyBin()

  expect(result.navigateTo).toBe(`/editor/2`)
  expect(DB.deleteFile).toBeCalledWith('3')
  expect(DB.deleteFile).toBeCalledWith('4')
  expect(DB.deleteFile).toBeCalledWith('5')
})
