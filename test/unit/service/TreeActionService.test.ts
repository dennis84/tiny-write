import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {CanvasService} from '@/services/CanvasService'
import type {FileService} from '@/services/FileService'
import type {ProjectService} from '@/services/ProjectService'
import type {ThreadService} from '@/services/ThreadService'
import {TreeActionService} from '@/services/TreeActionService'
import {TreeService} from '@/services/TreeService'
import {createCanvas, createFile} from '../testutil/data'

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/db', () => ({
  DB: mock({
    setTree: vi.fn(),
  }),
}))

const fileService = mock<FileService>()
const canvasService = mock<CanvasService>()
const projectService = mock<ProjectService>()
const threadService = mock<ThreadService>()

test('move - file', async () => {
  const treeService = new TreeService()
  const service = new TreeActionService(
    treeService,
    fileService,
    canvasService,
    projectService,
    threadService,
  )

  treeService.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', leftId: 'file_1'}),
    createFile({id: 'file_3', leftId: 'file_2'}),
  ])

  await service.move('file_2', 'file_1')

  expect(fileService.updateFile).toHaveBeenCalledTimes(2)
  expect(fileService.updateFile).toHaveBeenCalledWith('file_2', {
    parentId: 'file_1',
    leftId: undefined,
  })
  expect(fileService.updateFile).toHaveBeenCalledWith('file_3', {leftId: 'file_1'})
})

test('move - canvas', async () => {
  const treeService = new TreeService()
  const service = new TreeActionService(
    treeService,
    fileService,
    canvasService,
    projectService,
    threadService,
  )

  treeService.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', leftId: 'file_1'}),
    createFile({id: 'file_3', leftId: 'file_2'}),
    createCanvas({id: 'canvas_5', leftId: 'file_2'}),
    // {type: 'project', id: 'project_1', name: 'Project 1'},
  ])

  await service.move('canvas_5', 'file_1')

  expect(canvasService.updateCanvas).toHaveBeenCalledTimes(1)
  expect(canvasService.updateCanvas).toHaveBeenCalledWith('canvas_5', {parentId: 'file_1'})
})

test('move - project', async () => {
  const treeService = new TreeService()
  const service = new TreeActionService(
    treeService,
    fileService,
    canvasService,
    projectService,
    threadService,
  )

  treeService.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', leftId: 'file_1'}),
    createFile({id: 'file_3', leftId: 'file_2'}),
    createCanvas({id: 'canvas_5', leftId: 'file_3'}),
    {type: 'project', id: 'project_1', name: 'Project 1', leftId: 'canvas_5'},
  ])

  await service.before('project_1', 'file_1')

  expect(fileService.updateFile).toHaveBeenCalledTimes(1)
  expect(fileService.updateFile).toHaveBeenCalledWith('file_1', {leftId: 'project_1'})
  expect(projectService.updateProject).toHaveBeenCalledTimes(1)
  expect(projectService.updateProject).toHaveBeenCalledWith('project_1', {leftId: undefined})
})

test('move - into project', async () => {
  const treeService = new TreeService()
  const service = new TreeActionService(
    treeService,
    fileService,
    canvasService,
    projectService,
    threadService,
  )

  treeService.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', parentId: 'file_1'}),
    createFile({id: 'file_3', parentId: 'file_2'}),
    createCanvas({id: 'canvas_5', parentId: 'file_2', leftId: 'file_3'}),
    {type: 'project', id: 'project_1', name: 'Project 1', leftId: 'file_1'},
  ])

  await service.move('file_1', 'project_1')

  expect(fileService.updateFile).toHaveBeenCalledTimes(3)
  expect(fileService.updateFile).toHaveBeenCalledWith('file_1', {
    parentId: 'project_1',
    projectId: 'project_1',
  })
  expect(fileService.updateFile).toHaveBeenCalledWith('file_2', {
    parentId: 'file_1',
    projectId: 'project_1',
  })
  expect(fileService.updateFile).toHaveBeenCalledWith('file_3', {
    parentId: 'file_2',
    projectId: 'project_1',
  })
  expect(canvasService.updateCanvas).toHaveBeenCalledTimes(1)
  expect(canvasService.updateCanvas).toHaveBeenCalledWith('canvas_5', {
    parentId: 'file_2',
    leftId: 'file_3',
    projectId: 'project_1',
  })
  expect(projectService.updateProject).toHaveBeenCalledTimes(1)
  expect(projectService.updateProject).toHaveBeenCalledWith('project_1', {leftId: undefined})
})

test('move - project already assigned', async () => {
  const treeService = new TreeService()
  const service = new TreeActionService(
    treeService,
    fileService,
    canvasService,
    projectService,
    threadService,
  )

  treeService.reset([
    {type: 'project', id: 'project_1', name: 'Project 1'},
    createFile({id: 'file_1', parentId: 'project_1', projectId: 'project_1'}),
    createFile({id: 'file_2', parentId: 'project_1', projectId: 'project_1'}),
  ])

  await service.move('file_1', 'file_2')

  expect(fileService.updateFile).toHaveBeenCalledTimes(1)
  const args = vi.mocked(fileService.updateFile).mock.calls[0]
  expect(args[0]).toEqual('file_1')
  expect(args[1]).toStrictEqual({
    parentId: 'file_2',
    leftId: undefined,
  })
})
