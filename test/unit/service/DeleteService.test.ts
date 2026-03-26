import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {CanvasService} from '@/services/CanvasService'
import {DeleteService} from '@/services/DeleteService'
import type {FileService} from '@/services/FileService'
import {TreeService} from '@/services/TreeService'
import {isFile} from '@/state'
import {
  type CanvasEditorElement,
  type CanvasLinkElement,
  EdgeType,
  ElementType,
  type File,
} from '@/types'
import {createYUpdate} from '../testutil/prosemirror-util'
import {expectTree} from '../testutil/tree'

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

beforeEach(() => {
  vi.resetAllMocks()
})

test.each([
  {
    deleteId: '3',
    currentId: '3',
    navigateTo: {code: true, id: '2'},
    fileUpdated: true,
  },
  {
    deleteId: '2',
    currentId: '2',
    navigateTo: {id: '1'},
  },
  {
    deleteId: '2',
    currentId: '3',
    navigateTo: {id: '1'},
  },
  {
    deleteId: '1',
    currentId: '1',
    navigateTo: {id: '5'},
  },
  {
    deleteId: '2',
    currentId: '6',
    navigateTo: false,
  },
  {
    deleteId: '5',
    currentId: '5',
    navigateTo: {id: '1'},
  },
])('delete - soft %#', async (data) => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const treeService = new TreeService()

  treeService.reset([
    createFile({id: '1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5'}),
  ])

  const service = new DeleteService(fileService, canvasService, treeService)

  const currentNode = treeService.getItem(data.currentId)
  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(currentNode?.value as File)

  fileService.findFileById.mockImplementation((id: string) => {
    const item = treeService.getItem(id)?.value
    if (isFile(item)) return item
    return undefined
  })

  const node = treeService.getItem(data.deleteId)
  if (!node) throw Error('Node not found')

  const result = await service.delete(node)

  if (result.navigateTo) {
    expect(result.navigateTo).toMatchObject(data.navigateTo as any)
  } else {
    expect(result.navigateTo).toEqual(data.navigateTo)
  }

  expect(fileService.deleteFile).toHaveBeenCalledWith(data.deleteId)
})

test('delete - update tree', async () => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const treeService = new TreeService()

  const service = new DeleteService(fileService, canvasService, treeService)

  treeService.reset([
    createFile({id: '1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5'}),
    {
      id: '6',
      camera: {point: [0, 0], zoom: 1},
      elements: [
        createEditorElement({id: '1'}),
        createEditorElement({id: '2'}),
        createLinkElement({id: '3', from: '1', to: '2'}),
      ],
      lastModified: new Date(),
    },
  ])

  expectTree(
    treeService.tree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
        └ 3 (parentId=2, leftId=)
    └ 4 (parentId=, leftId=)
    └ 5 (parentId=, leftId=)
    └ 6 (parentId=, leftId=)
    `,
  )

  const currentNode = treeService.getItem('1')
  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(currentNode?.value as File)

  fileService.findFileById.mockImplementation((id: string) => {
    const item = treeService.getItem(id)?.value
    if (isFile(item)) return item
    return undefined
  })

  // biome-ignore lint/style/noNonNullAssertion: test code
  await service.delete(treeService.getItem('2')!)

  expectTree(
    treeService.tree,
    `
    └ 1 (parentId=, leftId=)
    └ 4 (parentId=, leftId=)
    └ 5 (parentId=, leftId=)
    └ 6 (parentId=, leftId=)
    `,
  )
})

test('delete - local file', async () => {
  const fileService = mock<FileService>({files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const treeService = new TreeService()

  const service = new DeleteService(fileService, canvasService, treeService)

  treeService.reset([
    createFile({id: '1', path: '/path/to/file1.ts'}),
    createFile({id: '2', newFile: '/path/to/file2.ts'}),
  ])

  // biome-ignore lint/style/noNonNullAssertion: test code
  await service.delete(treeService.getItem('1')!)
  expect(fileService.deleteFile).toHaveBeenCalledWith('1', true)

  // biome-ignore lint/style/noNonNullAssertion: test code
  await service.delete(treeService.getItem('2')!)
  expect(fileService.deleteFile).toHaveBeenCalledWith('2', true)
})

test.each([
  {
    deleteId: '3',
    currentId: '3',
    navigateTo: {code: true, id: '2'},
    expectedFiles: 1,
  },
  {
    deleteId: '2',
    currentId: '2',
    navigateTo: {id: '1'},
    expectedFiles: 2,
  },
  {
    deleteId: '2',
    currentId: '3',
    navigateTo: {id: '1'},
    expectedFiles: 2,
  },
  {
    deleteId: '1',
    currentId: '1',
    navigateTo: {id: '5'},
    expectedFiles: 3,
  },
])('delete - forever %#', async (data) => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const treeService = new TreeService()

  const service = new DeleteService(fileService, canvasService, treeService)

  treeService.reset([
    createFile({id: '1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5'}),
  ])

  const currentNode = treeService.getItem(data.currentId)
  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(currentNode?.value as File)

  fileService.findFileById.mockImplementation((id: string) => {
    const item = treeService.getItem(id)?.value
    if (isFile(item)) return item
    return undefined
  })

  const node = treeService.getItem(data.deleteId)
  if (!node) throw Error('Node not found')

  const result = await service.delete(node, true)

  if (!data.navigateTo) {
    expect(result.navigateTo).toBe(undefined)
  } else {
    expect(result.navigateTo).toMatchObject(data.navigateTo)
  }

  expect(fileService.deleteFile).toHaveBeenCalledTimes(data.expectedFiles)
  expect(canvasService.removeElementFromAll).toHaveBeenCalledWith(data.deleteId)
})

test('emptyBin', async () => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})

  const files = [
    createFile({id: '1', deleted: true}),
    createFile({id: '2', parentId: '1'}),
    createFile({id: '3', parentId: '2', deleted: true}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5', parentId: '4', deleted: true}),
  ]

  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(files[2])
  fileService.findFileById.mockReturnValue(files[1])

  const treeService = new TreeService()
  treeService.reset(files)

  const service = new DeleteService(fileService, canvasService, treeService)

  const result = await service.emptyBin()

  expect(result.navigateTo).toMatchObject({id: '2'})
  expect(fileService.deleteFile).toHaveBeenCalledWith('3', true)
  expect(fileService.deleteFile).toHaveBeenCalledWith('4', true)
  expect(fileService.deleteFile).toHaveBeenCalledWith('5', true)
})
