import {EditorView} from '@codemirror/view'
import {waitFor} from '@solidjs/testing-library'
import {v5} from 'uuid'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import type {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import {ProjectService} from '@/services/ProjectService'
import {TreeService} from '@/services/TreeService'
import {AttachmentType, type Directory, type FileAttachment} from '@/types'
import {
  createDirEntry,
  createDirectory,
  createFile,
  createFilename,
  createProject,
} from '../testutil/data'
import {expectTree} from '../testutil/tree'
import {createIpcMock} from '../testutil/util'

vi.stubGlobal('__TAURI__', {})

beforeEach(() => {
  vi.resetAllMocks()

  // Mock ID generation of DirEntry to Filename|Directory
  vi.mocked(v5).mockImplementation((filePath) => {
    const parts = String(filePath).split('/')
    return parts[parts.length - 1] as any
  })
})

vi.mock('uuid', {spy: true})

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
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>()
  const service = new ProjectService(treeService, fileService, locationService)

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
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>()
  const service = new ProjectService(treeService, fileService, locationService)

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
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>()
  const service = new ProjectService(treeService, fileService, locationService)
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
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>()
  const service = new ProjectService(treeService, fileService, locationService)

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

test('createAttachment', async () => {
  createIpcMock({})
  const treeService = new TreeService()
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>()
  const service = new ProjectService(treeService, fileService, locationService)

  const project = createProject()

  const codeEditorView = new EditorView()
  const doc = 'let x = 1'

  codeEditorView.dispatch({changes: {from: 0, insert: doc}})
  const openedFile = createFile({
    id: 'code4.ts',
    path: '/path/to/code4.ts',
    parentId: 'dir1',
    codeLang: 'typescript',
    leftId: 'code3.yaml',
    code: true,
    codeEditorView,
  })

  const fileAttachment: FileAttachment = {
    content: `\`\`\`typescript id=code4.ts
let x = 1
\`\`\``,
    type: AttachmentType.File,
    codeLang: openedFile.codeLang,
    fileId: openedFile.id,
    parentId: openedFile.parentId,
    leftId: openedFile.leftId,
  }

  fileService.createAttachment.mockReturnValue(fileAttachment)

  const items = [
    project,
    createDirectory({id: 'dir1', name: 'dir1'}),
    createFilename({id: 'code3.yaml', name: 'code3.yaml', parentId: 'dir1'}),
    createFile(openedFile),
    createFilename({id: 'code1.yaml', name: 'code1.yaml'}),
    createFilename({id: 'code2.yaml', name: 'code2.yaml'}),
  ]

  fileService.getTitle.mockResolvedValue('code4.ts')

  treeService.reset(items)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  const attachment = await service.createAttachment(project)

  expect(attachment.type).toEqual(AttachmentType.Project)
  expect(attachment.projectId).toEqual('project_1')
  expect(attachment.projectName).toEqual('Project 1')
  expect(attachment.tree).toEqual(`├── dir1/
  ├── code3.yaml
  ├── code4.ts
├── code1.yaml
├── code2.yaml\n`)

  expect(attachment.files).toEqual([fileAttachment])
})
