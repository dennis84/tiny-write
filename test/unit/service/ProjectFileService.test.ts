import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {FileService} from '@/services/FileService'
import {ProjectFileService} from '@/services/ProjectFileService'
import type {ProjectService} from '@/services/ProjectService'
import {createProject} from '../testutil/data'
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
  fileService.newFile.mockImplementation(async (params) => ({
    type: 'file' as const,
    id: '1',
    lastModified: new Date(),
    ydoc: new Uint8Array(),
    versions: [],
    ...params,
  }))

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
  fileService.newFile.mockImplementation(async (params) => ({
    type: 'file' as const,
    id: '1',
    lastModified: new Date(),
    ydoc: new Uint8Array(),
    versions: [],
    ...params,
  }))

  const service = new ProjectFileService(fileService, projectService)

  const file = await service.newFileByPath({path: filePath})

  expect(file).toBeDefined()
  expect(file.projectId).toEqual('project_1')
})
