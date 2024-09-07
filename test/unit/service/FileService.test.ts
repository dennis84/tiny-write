import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import * as Y from 'yjs'
import {Mode, createState} from '@/state'
import {FileService} from '@/services/FileService'
import {CollabService} from '@/services/CollabService'
import {createYUpdate, createSubdoc} from '../util/prosemirror-util'
import {createIpcMock} from '../util/util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
})

const collabService = mock<CollabService>()

test('only save file type', async () => {
  const ydoc = createSubdoc('1', ['Test'])

  const [store, setState] = createStore(
    createState({
      files: [{id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: []}],
    }),
  )

  const service = new FileService(collabService, store, setState)
  setState('collab', {ydoc})

  ydoc.getText('2').insert(0, '1')
  expect(ydoc.getText('2').length).toBe(1)
  expect(ydoc.getXmlFragment('1').length).toBe(1)

  ydoc.getXmlFragment('1').push([new Y.XmlText('1')])
  expect(ydoc.getXmlFragment('1').length).toBe(2)

  service.updateFile('1', {})

  const fileYdoc = new Y.Doc()
  Y.applyUpdate(fileYdoc, store.files[0].ydoc)

  expect(fileYdoc?.getXmlFragment('1').length).toBe(1)
  expect(fileYdoc?.getText('2').length).toBe(0)
})

test('restore', async () => {
  const ydoc = createSubdoc('1', ['Test'])

  const [store, setState] = createStore(
    createState({
      files: [
        {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], active: true},
        {id: '2', ydoc: createYUpdate('2', ['Test2']), versions: [], active: false, deleted: true},
      ],
    }),
  )

  const service = new FileService(collabService, store, setState)
  setState('collab', {ydoc})
  setState('mode', Mode.Editor)

  await service.restore('2')
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBe(true)
  expect(store.files[1].active).toBe(false)
  expect(store.files[1].deleted).toBe(false)
})

test('getTitle', async () => {
  createIpcMock()

  const [store, setState] = createStore(
    createState({
      files: [
        {id: '1', ydoc: createYUpdate('1', ['Test1', 'foo']), versions: []},
        {id: '2', ydoc: createYUpdate('2', ['Test2', 'bar']), versions: []},
        {id: '3', ydoc: createYUpdate('3', ['a'.repeat(30), 'bar']), versions: []},
        {
          id: '4',
          ydoc: createYUpdate('4', ['Test4']),
          versions: [],
          path: '/users/me/project/README.md',
        },
      ],
    }),
  )

  const service = new FileService(collabService, store, setState)
  expect(await service.getTitle(store.files[0])).toBe('Test1')
  expect(await service.getTitle(store.files[1])).toBe('Test2')
  expect(await service.getTitle(store.files[2])).toBe('a'.repeat(25))
  expect(await service.getTitle(store.files[3])).toBe('~/project/README.md')
})

test('findFile - found', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    resolve_path: (path) => '/path/to' + path,
  })

  const [store, setState] = createStore(
    createState({
      files: [
        {id: '1', ydoc: createYUpdate('1', ['Test1']), versions: []},
        {id: '2', ydoc: createYUpdate('2', ['Test2']), versions: [], path: '/path/to/file2'},
      ],
    }),
  )

  const service = new FileService(collabService, store, setState)
  expect(service.findFileById('1')?.id).toBe('1')
  expect((await service.findFileByPath('/file2'))?.id).toBe('2')
})

test('findFile - not found', async () => {
  vi.stubGlobal('__TAURI__', {})
  createIpcMock({
    resolve_path: () => {
      throw new Error('Fail')
    },
  })

  const [store, setState] = createStore(
    createState({
      files: [{id: '2', ydoc: createYUpdate('2', ['Test2']), versions: [], path: '/path/to/file2'}],
    }),
  )

  const service = new FileService(collabService, store, setState)
  expect(service.findFileById('1')).toBe(undefined)
  await expect(service.findFileByPath('/path/to/file2')).rejects.toThrowError()
})
