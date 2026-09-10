import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {CanvasService} from '@/services/CanvasService'
import {DeleteService} from '@/services/DeleteService'
import type {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import type {ProjectService} from '@/services/ProjectService'
import type {ThreadService} from '@/services/ThreadService'
import {TreeService} from '@/services/TreeService'
import {createEditorElement, createFile, createLinkElement, createProject} from '../testutil/data'
import {expectTree} from '../testutil/tree'

vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  vi.resetAllMocks()
})

test.each([
  {
    deleteId: '3',
    currentId: '3',
    navigateTo: {code: true, id: '2'},
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
    navigateTo: undefined,
  },
  {
    deleteId: '2',
    currentId: '6',
    navigateTo: false,
  },
  {
    deleteId: '5',
    currentId: '5',
    navigateTo: undefined,
  },
])('delete - soft %#', async (data) => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const threadService = mock<ThreadService>({threads: []})
  const projectService = mock<ProjectService>({projects: []})
  const locationService = mock<LocationService>({currentItemId: undefined})
  const treeService = new TreeService()

  treeService.reset([
    createFile({id: '1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5'}),
  ])

  const service = new DeleteService(
    fileService,
    canvasService,
    threadService,
    projectService,
    locationService,
    treeService,
  )

  vi.spyOn(locationService, 'currentItemId', 'get').mockReturnValue(data.currentId)

  const node = treeService.getItem(data.deleteId)!
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
  const threadService = mock<ThreadService>({threads: []})
  const projectService = mock<ProjectService>({projects: []})
  const locationService = mock<LocationService>({currentItemId: undefined})
  const treeService = new TreeService()

  const service = new DeleteService(
    fileService,
    canvasService,
    threadService,
    projectService,
    locationService,
    treeService,
  )

  treeService.reset([
    createFile({id: '1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5'}),
    {
      type: 'canvas',
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
  const threadService = mock<ThreadService>({threads: []})
  const projectService = mock<ProjectService>({projects: []})
  const locationService = mock<LocationService>({currentItemId: undefined})
  const treeService = new TreeService()

  const service = new DeleteService(
    fileService,
    canvasService,
    threadService,
    projectService,
    locationService,
    treeService,
  )

  treeService.reset([
    createFile({id: '1', path: '/path/to/file1.ts'}),
    createFile({id: '2', newFile: '/path/to/file2.ts'}),
  ])

  await service.delete(treeService.getItem('1')!)
  expect(fileService.deleteFile).toHaveBeenCalledWith('1', true)

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
    navigateTo: {id: 'project_1'},
    expectedFiles: 3,
  },
  {
    deleteId: 'project_1',
    currentId: '1',
    navigateTo: undefined,
    expectedFiles: 3,
  },
])('delete - forever %#', async (data) => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const threadService = mock<ThreadService>({threads: []})
  const projectService = mock<ProjectService>({projects: []})
  const locationService = mock<LocationService>({currentItemId: undefined})
  const treeService = new TreeService()

  const service = new DeleteService(
    fileService,
    canvasService,
    threadService,
    projectService,
    locationService,
    treeService,
  )

  treeService.reset([
    createProject({id: 'project_1'}),
    createFile({id: '1', parentId: 'project_1'}),
    createFile({id: '2', parentId: '1', code: true}),
    createFile({id: '3', parentId: '2'}),
    createFile({id: '5'}),
  ])

  vi.spyOn(locationService, 'currentItemId', 'get').mockReturnValue(data.currentId)

  const node = treeService.getItem(data.deleteId)!
  const result = await service.delete(node, true)

  if (!data.navigateTo) {
    expect(result.navigateTo).toBe(undefined)
  } else {
    expect(result.navigateTo).toMatchObject(data.navigateTo)
  }

  expect(fileService.deleteFile).toHaveBeenCalledTimes(data.expectedFiles)
  expect(canvasService.removeElementFromAll).toHaveBeenCalledTimes(data.expectedFiles)
})

test('emptyBin', async () => {
  const fileService = mock<FileService>({currentFile: undefined, files: []})
  const canvasService = mock<CanvasService>({canvases: []})
  const threadService = mock<ThreadService>({threads: []})
  const projectService = mock<ProjectService>({projects: []})
  const locationService = mock<LocationService>({currentItemId: undefined})

  const files = [
    createFile({id: '1', deleted: true}),
    createFile({id: '2', parentId: '1'}),
    createFile({id: '3', parentId: '2', deleted: true}),
    createFile({id: '4', deleted: true}),
    createFile({id: '5', parentId: '4', deleted: true}),
  ]

  vi.spyOn(locationService, 'currentItemId', 'get').mockReturnValue(files[2].id)

  const treeService = new TreeService()
  treeService.reset(files)

  const service = new DeleteService(
    fileService,
    canvasService,
    threadService,
    projectService,
    locationService,
    treeService,
  )

  const result = await service.emptyBin()

  expect(result.navigateTo).toMatchObject({id: '2'})
  expect(fileService.deleteFile).not.toHaveBeenCalledWith('1', true)
  expect(fileService.deleteFile).toHaveBeenCalledWith('3', true)
  expect(fileService.deleteFile).toHaveBeenCalledWith('4', true)
  expect(fileService.deleteFile).toHaveBeenCalledWith('5', true)
})
