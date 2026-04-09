import {waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {ProjectService} from '@/services/ProjectService'
import {TreeService} from '@/services/TreeService'
import type {Directory} from '@/types'
import {createDirEntry, createDirectory, createFilename, createProject} from '../testutil/data'
import {expectTree} from '../testutil/tree'
import {createIpcMock} from '../testutil/util'

vi.stubGlobal('__TAURI__', {})

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/db', () => ({
  DB: mock({
    getProjects: vi.fn(),
  }),
}))

test('newProject', async () => {
  vi.spyOn(DB, 'getProjects').mockResolvedValue([
    {type: 'project', id: 'project_1', name: 'Project 1'},
  ])

  const treeService = new TreeService()
  const service = new ProjectService(treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newProject()

  expect(service.projects).toHaveLength(2)

  expect(DB.updateProject).toHaveBeenCalled()
})

test('updateProject', async () => {
  vi.spyOn(DB, 'getProjects').mockResolvedValue([
    {type: 'project', id: 'project_1', name: 'Project 1'},
  ])

  const treeService = new TreeService()
  const service = new ProjectService(treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.updateProject('project_1', {name: 'Updated'})

  expect(service.projects[0].name).toEqual('Updated')

  expect(DB.updateProject).toHaveBeenCalled()
})

test('toggleDirectory - project', async () => {
  createIpcMock({
    list_contents: () => [
      createDirEntry({name: 'dir1', isDirectory: true, isFile: false}),
      createDirEntry({name: 'code1.yaml'}),
      createDirEntry({name: 'code2.yaml'}),
    ],
  })

  const project = createProject()

  vi.spyOn(DB, 'getProjects').mockResolvedValue([project])

  const treeService = new TreeService()
  const service = new ProjectService(treeService)
  treeService.reset([project])

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.toggleDirectory(project)

  expectTree(
    treeService.tree,
    `
    └ project_1 (parentId=, leftId=)
      └ dir1 (parentId=project_1, leftId=)
      └ code1.yaml (parentId=project_1, leftId=)
      └ code2.yaml (parentId=project_1, leftId=)
    `,
  )
})

test('toggleDirectory - directory', async () => {
  createIpcMock({
    list_contents: () => [
      createDirEntry({name: 'code3.yaml'}),
      createDirEntry({name: 'code4.yaml'}),
    ],
  })

  const project = createProject()

  vi.spyOn(DB, 'getProjects').mockResolvedValue([project])

  const treeService = new TreeService()
  const service = new ProjectService(treeService)

  const items = [
    project,
    createDirectory({id: 'dir1', name: 'dir1'}),
    createFilename({id: 'code1.yaml', name: 'code1.yaml'}),
    createFilename({id: 'code2.yaml', name: 'code2.yaml'}),
  ]

  treeService.reset(items)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.toggleDirectory(items[1] as Directory)

  expectTree(
    treeService.tree,
    `
    └ project_1 (parentId=, leftId=)
      └ dir1 (parentId=project_1, leftId=)
        └ code3.yaml (parentId=dir1, leftId=)
        └ code4.yaml (parentId=dir1, leftId=)
      └ code1.yaml (parentId=project_1, leftId=)
      └ code2.yaml (parentId=project_1, leftId=)
    `,
  )
})
