import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {FileService} from '@/services/FileService'
import {ProjectFileService} from '@/services/ProjectFileService'
import type {ProjectService} from '@/services/ProjectService'
import {createFile, createProject} from '../testutil/data'
import {createIpcMock} from '../testutil/util'

vi.mock('@/db', () => ({
  DB: mock({
    getFiles: vi.fn(),
  }),
}))

vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.resetAllMocks()
})

const fileService = mock<FileService>()
const projectService = mock<ProjectService>({projects: []})

test.each([
  {path: '/path/to/file.md', expectedCode: false},
  {path: '/path/to/file.ts', expectedCode: true},
])('newFileByPath - text', async (data) => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({})

  fileService.findFileById.mockReturnValue(undefined)
  fileService.newFile.mockImplementation(async (params) => createFile({...params}))

  const service = new ProjectFileService(fileService, projectService)

  const file = await service.newFileByPath({path: data.path})

  expect(file).toBeDefined()
  expect(file.code).toEqual(data.expectedCode)
})

test('newFileByPath - match existing project path', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({})

  const filePath = '/users/me/project_1/file.ts'

  vi.spyOn(projectService, 'projects', 'get').mockReturnValue([createProject()])
  fileService.findFileById.mockReturnValue(undefined)
  fileService.newFile.mockImplementation(async (params) => createFile({...params}))

  const service = new ProjectFileService(fileService, projectService)

  const file = await service.newFileByPath({path: filePath})

  expect(file).toBeDefined()
  expect(file.projectId).toEqual('project_1')
})

test('newFileByPath - does not match project with path that is only a substring prefix', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({})

  // worktreePath is '/users/me/project_1' — must NOT match '/users/me/project_10/file.ts'
  const filePath = '/users/me/project_10/file.ts'

  vi.spyOn(projectService, 'projects', 'get').mockReturnValue([createProject()])
  fileService.findFileById.mockReturnValue(undefined)
  fileService.newFile.mockImplementation(async (params) => createFile({...params}))

  const service = new ProjectFileService(fileService, projectService)

  const file = await service.newFileByPath({path: filePath})

  expect(file).toBeDefined()
  expect(file.projectId).toBeUndefined()
})
