import {waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import * as Y from 'yjs'
import {DB} from '@/db'
import type {CollabService} from '@/services/CollabService'
import {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import type {TreeService} from '@/services/TreeService'
import * as cmUtils from '../testutil/codemirror-util'
import {createFile} from '../testutil/data'
import * as pmUtils from '../testutil/prosemirror-util'
import {createIpcMock} from '../testutil/util'

vi.mock('@/db', () => ({
  DB: mock({
    getFiles: vi.fn(),
    getFile: vi.fn(),
  }),
}))

vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.resetAllMocks()
})

const collabService = mock<CollabService>()
const locationService = mock<LocationService>()
const treeService = mock<TreeService>()
const lastModified = new Date()

test('updateFile - only save file type', async () => {
  const ydoc = pmUtils.createSubdoc('1', ['Test'])

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  ydoc.getText('2').insert(0, '1')
  expect(ydoc.getText('2').length).toBe(1)
  expect(ydoc.getXmlFragment('1').length).toBe(1)

  ydoc.getXmlFragment('1').push([new Y.XmlText('1')])
  expect(ydoc.getXmlFragment('1').length).toBe(2)

  service.updateFile('1', {})

  const fileYdoc = new Y.Doc()
  Y.applyUpdate(fileYdoc, service.files[0].ydoc)

  expect(fileYdoc?.getXmlFragment('1').length).toBe(1)
  expect(fileYdoc?.getText('2').length).toBe(0)
})

test('restore', async () => {
  const ydoc = pmUtils.createSubdoc('1', ['Test'])

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], lastModified},
    {
      id: '2',
      ydoc: pmUtils.createYUpdate('2', ['Test2']),
      versions: [],
      lastModified,
      deleted: true,
    },
  ])

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.restore('2')
  expect(service.files.length).toBe(2)
  expect(service.files[1].deleted).toBe(false)
})

test('getTitle', async () => {
  createIpcMock()

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: pmUtils.createYUpdate('1', ['Test1', 'foo']), versions: [], lastModified},
    {id: '2', ydoc: pmUtils.createYUpdate('2', ['Test2', 'bar']), versions: [], lastModified},
    {
      id: '3',
      ydoc: pmUtils.createYUpdate('3', ['a'.repeat(30), 'bar']),
      versions: [],
      lastModified,
    },
    {
      id: '4',
      code: true,
      newFile: 'src/components/Main.tsx',
      ydoc: cmUtils.createYUpdate('4', ''),
      lastModified: new Date(),
    },
  ])

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newFile({
    id: '5',
    ydoc: pmUtils.createYUpdate('4', ['Test4']),
    path: '/users/me/project/README.md',
    lastModified,
  })

  expect(await service.getTitle(service.files[0])).toBe('Test1')
  expect(await service.getTitle(service.files[1])).toBe('Test2')
  expect(await service.getTitle(service.files[2])).toBe('a'.repeat(25))
  expect(await service.getTitle(service.files[3])).toBe('Main.tsx')
  expect(await service.getTitle(service.files[4])).toBe('~/project/README.md')
})

test('findFile - found', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    to_absolute_path: (path) => `/path/to${path}`,
  })

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: pmUtils.createYUpdate('1', ['Test1']), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newFile({
    id: '2',
    ydoc: pmUtils.createYUpdate('2', ['Test2']),
    path: '/path/to/file2',
  })

  expect(service.findFileById('1')?.id).toBe('1')
  expect((await service.findFileByPath('/file2'))?.id).toBe('2')
})

test('findFile - not found', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    to_absolute_path: () => {
      throw new Error('Fail')
    },
  })

  vi.spyOn(DB, 'getFiles').mockResolvedValue([])

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newFile({
    id: '2',
    ydoc: pmUtils.createYUpdate('2', ['Test2']),
    path: '/path/to/file2',
  })

  expect(service.findFileById('1')).toBe(undefined)
  await expect(service.findFileByPath('/path/to/file2')).rejects.toThrow()
})

test.each([
  {code: true, path: '/path/name.md', expected: 'markdown'},
  {code: true, path: '/path/name.rs', expected: 'rust'},
  {code: true, path: '/path/name.test.ts', expected: 'typescript'},
  {code: true, path: '/path/name.test/', expected: undefined}, // should not be possible
  {code: false, path: '/path/name.ts', expected: 'typescript'}, // from path
  {code: true, newFile: '/path/name.ts', expected: 'typescript'},
  {code: true, newFile: '/path/name.ts', codeLang: 'markdown', expected: 'markdown'},
])('createFile - codeLang', async ({code, codeLang, path, newFile, expected}) => {
  const file = await FileService.createFile({code, codeLang, path, newFile})
  expect(file.codeLang).toBe(expected)
})

test('newFile', async () => {
  //const getFileSpy = vi.spyOn(DB, 'getFile')

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  const file = await service.newFile()

  expect(file).toBeDefined()
  expect(service.files.length).toBe(1)

  expect(vi.spyOn(DB, 'getFile')).toHaveBeenCalled()
})

test('newFile - existing', async () => {
  const dbFile = {
    id: '1',
    ydoc: pmUtils.createYUpdate('1', ['a']),
    lastModified,
    path: '/123',
    codeLang: 'kotlin',
  }

  vi.spyOn(DB, 'getFiles').mockResolvedValue([dbFile])
  vi.spyOn(DB, 'getFile').mockResolvedValue({...dbFile, lastCursorPos: 123})

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  const file = await service.newFile({id: '1', path: '/new'})

  expect(service.files.length).toBe(1)
  expect(file).toBeDefined()
  expect(file.ydoc).toEqual(dbFile.ydoc)
  expect(file.path).toEqual('/new')
  expect(file.codeLang).toEqual(dbFile.codeLang)
  expect(file.lastCursorPos).toEqual(123)

  expect(vi.spyOn(DB, 'getFile')).toHaveBeenCalled()
})

test('renameFile - title', async () => {
  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: pmUtils.createYUpdate('1', ['a']), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.renameFile('1', 'Title')

  expect(service.files[0].title).toBe('Title')
})

test('renameFile - update path', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    dirname: () => '/path',
    rename: () => undefined,
  })

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newFile({
    id: '1',
    ydoc: pmUtils.createYUpdate('1', ['a']),
    path: '/path/old.js',
    codeLang: 'javascript',
  })

  await service.renameFile('1', 'new.ts')

  expect(service.files[0].title).toBe(undefined)
  expect(service.files[0].newFile).toBe(undefined)
  expect(service.files[0].path).toBe('/path/new.ts')
  expect(service.files[0].codeLang).toBe('typescript')
})

test('renameFile - update newFile', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    dirname: () => '/path',
  })

  const service = new FileService(collabService, locationService, treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newFile({
    id: '1',
    ydoc: pmUtils.createYUpdate('1', ['a']),
    newFile: '/path/old.js',
    codeLang: 'javascript',
  })

  await service.renameFile('1', 'new.ts')

  expect(service.files[0].title).toBe(undefined)
  expect(service.files[0].path).toBe(undefined)
  expect(service.files[0].newFile).toBe('/path/new.ts')
  expect(service.files[0].codeLang).toBe('typescript')
})

test.each([
  [undefined, 0],
  [new Date(), 1],
])('saveFile - unsaved', async (lastModified, calls) => {
  const file = {
    type: 'file' as const,
    id: '1',
    ydoc: pmUtils.createYUpdate('1', ['a']),
    versions: [],
    lastModified,
  }

  await FileService.saveFile(file)

  expect(DB.updateFile).toHaveBeenCalledTimes(calls)
})

test.each([
  ['/path/to/file', undefined],
  [undefined, '/path/to/file'],
])('saveFile - local files', async (path, newFile) => {
  const file = createFile({
    id: '1',
    ydoc: pmUtils.createYUpdate('1', ['a']),
    lastModified: new Date(),
    path,
    newFile,
  })

  await FileService.saveFile(file)

  expect(DB.updateFile).toHaveBeenCalled()
})
