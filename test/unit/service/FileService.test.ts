import {waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import * as Y from 'yjs'
import {DB} from '@/db'
import type {CollabService} from '@/services/CollabService'
import {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import {createSubdoc, createYUpdate} from '../testutil/prosemirror-util'
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

const collabService = mock<CollabService>()
const locationService = mock<LocationService>()
const lastModified = new Date()

test('only save file type', async () => {
  const ydoc = createSubdoc('1', ['Test'])

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService)

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
  const ydoc = createSubdoc('1', ['Test'])

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], lastModified},
    {id: '2', ydoc: createYUpdate('2', ['Test2']), versions: [], lastModified, deleted: true},
  ])

  const service = new FileService(collabService, locationService)

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
    {id: '1', ydoc: createYUpdate('1', ['Test1', 'foo']), versions: [], lastModified},
    {id: '2', ydoc: createYUpdate('2', ['Test2', 'bar']), versions: [], lastModified},
    {id: '3', ydoc: createYUpdate('3', ['a'.repeat(30), 'bar']), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.addFile({
    id: '4',
    ydoc: createYUpdate('4', ['Test4']),
    versions: [],
    path: '/users/me/project/README.md',
    lastModified,
  })

  expect(await service.getTitle(service.files[0])).toBe('Test1')
  expect(await service.getTitle(service.files[1])).toBe('Test2')
  expect(await service.getTitle(service.files[2])).toBe('a'.repeat(25))
  expect(await service.getTitle(service.files[3])).toBe('~/project/README.md')
})

test('findFile - found', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    to_absolute_path: (path) => `/path/to${path}`,
  })

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test1']), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.addFile({
    id: '2',
    ydoc: createYUpdate('2', ['Test2']),
    versions: [],
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

  const service = new FileService(collabService, locationService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.addFile({
    id: '2',
    ydoc: createYUpdate('2', ['Test2']),
    versions: [],
    path: '/path/to/file2',
  })

  expect(service.findFileById('1')).toBe(undefined)
  await expect(service.findFileByPath('/path/to/file2')).rejects.toThrowError()
})

test.each([
  {code: true, path: '/path/name.md', expected: 'markdown'},
  {code: true, path: '/path/name.rs', expected: 'rust'},
  {code: true, path: '/path/name.test.ts', expected: 'typescript'},
  {code: true, path: '/path/name.test/', expected: undefined}, // should not be possible
  {code: false, path: '/path/name.ts', expected: 'typescript'}, // from path
  {code: true, newFile: '/path/name.ts', expected: 'typescript'},
  {code: true, newFile: '/path/name.ts', codeLang: 'markdown', expected: 'markdown'},
])('createFile - codeLang', ({code, codeLang, path, newFile, expected}) => {
  const file = FileService.createFile({code, codeLang, path, newFile})
  expect(file.codeLang).toBe(expected)
})

test('newFile', async () => {
  const service = new FileService(collabService, locationService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  const file = await service.newFile()

  expect(file).toBeDefined()
  expect(service.files.length).toBe(1)
})

test('renameFile - title', async () => {
  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['a']), versions: [], lastModified},
  ])

  const service = new FileService(collabService, locationService)

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

  const service = new FileService(collabService, locationService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.addFile({
    id: '1',
    ydoc: createYUpdate('1', ['a']),
    versions: [],
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

  const service = new FileService(collabService, locationService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.addFile({
    id: '1',
    ydoc: createYUpdate('1', ['a']),
    versions: [],
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
    id: '1',
    ydoc: createYUpdate('1', ['a']),
    versions: [],
    lastModified,
  }

  await FileService.saveFile(file)

  expect(DB.updateFile).toBeCalledTimes(calls)
})

test.each([
  ['/path/to/file', undefined],
  [undefined, '/path/to/file'],
])('saveFile - local files', async (path, newFile) => {
  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['a']),
    versions: [],
    lastModified: new Date(),
    path,
    newFile,
  }

  await FileService.saveFile(file)

  expect(DB.deleteFile).toBeCalled()
  expect(DB.updateFile).not.toBeCalled()
})
