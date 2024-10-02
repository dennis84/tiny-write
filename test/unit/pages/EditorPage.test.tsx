import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {createState, Mode} from '@/state'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {createYUpdate} from '../util/prosemirror-util'
import {createIpcMock} from '../util/util'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const lastModified = new Date()

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
})

test('open - new file', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))

  const initial = createState()

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Editor)
  expect(store.files.length).toBe(1)
  expect(store.files[0].active).toBeTruthy()
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')
})

test('open - active', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: [], active: true},
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Editor)
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeFalsy()
  expect(store.files[1].active).toBeTruthy()
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test 2$/)
})

test('open - new file with id', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/3'))

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Editor)
  expect(store.files.length).toBe(3)
  expect(store.files[0].active).toBeFalsy()
  expect(store.files[1].active).toBeFalsy()
  expect(store.files[2].active).toBeTruthy()
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')
})

test('open - existing file', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Editor)
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeTruthy()
  expect(store.files[1].active).toBeFalsy()
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Text$/)
})

test('open - share', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1?share=true'))

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(store.collab?.provider).toBeDefined()
    store.collab!.provider.synced = true
  })

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Editor)
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeTruthy()
  expect(store.files[1].active).toBeFalsy()
  expect(store.collab?.started).toBe(true)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent(/^Text$/)
  })
})

test('open - file with path', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    read_text: (path) => (path === 'file1' ? '# File1' : '# File2'),
  })

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Text']),
        lastModified,
        versions: [],
        path: 'file1',
      },
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Editor)
  expect(store.files.length).toBe(1)
  expect(store.files[0].active).toBeTruthy()
  expect(store.files[0].path).toBe('file1')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File1$/)
})

test('open - file not found', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    resolve_path: () => {
      throw new Error('Fail')
    },
  })

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Text']),
        lastModified,
        versions: [],
        path: 'file1',
      },
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('error')).toBeDefined()
  })

  expect(store.error).toBeDefined()
})

test('open - file arg', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({file: 'file2.md'}),
    read_text: () => 'File2',
  })

  const initial = createState({args: {file: 'file2.md'}})
  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.path).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File2$/)
})

test('open - file arg exists', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({file: 'file2.md'}),
    read_text: () => 'File2',
  })

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Text']),
        lastModified,
        versions: [],
        path: 'file2.md',
      },
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.path).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File2$/)
})

test('open - newFile arg', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({newFile: 'file2.md'}),
  })

  const initial = createState()
  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.newFile).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Start typing ...$/)
})

test('open - newFile arg - path exists', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({newFile: 'file2.md'}),
    read_text: () => 'File2',
  })

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Text']),
        lastModified,
        versions: [],
        path: 'file2.md',
      },
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.path).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File2$/)
})

test('open - newFile arg - newFile exists', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({newFile: 'file2.md'}),
  })

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Text']),
        lastModified,
        versions: [],
        newFile: 'file2.md',
      },
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.files.length).toBe(1)
  expect(fileService.currentFile?.newFile).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent('Text')
})
