import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {createStore} from 'solid-js/store'
import {createState} from '@/state'
import {FileService} from '@/services/FileService'
import {Ctrl} from '@/services'
import {createIpcMock, createYUpdate} from '../util'

vi.stubGlobal('__TAURI__', {})
vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
})

const ctrl = mockDeep<Ctrl>()

test('getTitle', async () => {
  createIpcMock()

  const [store, setState] = createStore(createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Test1', 'foo']), versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test2', 'bar']), versions: []},
      {id: '3', ydoc: createYUpdate('3', ['a'.repeat(30), 'bar']), versions: []},
      {id: '4', ydoc: createYUpdate('4', ['Test4']), versions: [], path: '/users/me/project/README.md'},
    ],
  }))

  const service = new FileService(ctrl, store, setState)
  expect(await service.getTitle(store.files[0])).toBe('Test1')
  expect(await service.getTitle(store.files[1])).toBe('Test2')
  expect(await service.getTitle(store.files[2])).toBe('a'.repeat(25))
  expect(await service.getTitle(store.files[3])).toBe('~/project/README.md')
})

test('findFile - found', async () => {
  createIpcMock({
    'resolve_path': (path) => '/path/to' + path
  })

  const [store, setState] = createStore(createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Test1']), versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test2']), versions: [], path: '/path/to/file2'},
    ],
  }))

  const service = new FileService(ctrl, store, setState)
  expect(service.findFileById('1')?.id).toBe('1')
  expect((await service.findFileByPath('/file2'))?.id).toBe('2')
})

test('findFile - not found', async () => {
  createIpcMock({
    'resolve_path': () => { throw new Error('Fail') }
  })

  const [store, setState] = createStore(createState({
    files: [
      {id: '2', ydoc: createYUpdate('2', ['Test2']), versions: [], path: '/path/to/file2'},
    ],
  }))

  const service = new FileService(ctrl, store, setState)
  expect(service.findFileById('1')).toBe(undefined)
  await expect(service.findFileByPath('/path/to/file2')).rejects.toThrowError()
})
