import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {createState, Page} from '@/state'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {createYUpdate} from '../util/prosemirror-util'
import {createIpcMock, stubLocation} from '../util/util'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const lastModified = new Date()

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
})

test('open - new file', async () => {
  stubLocation('/')

  const initial = createState()

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.lastLocation?.page).toBe(Page.Editor)
  expect(store.files.length).toBe(1)
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')
})

test('open - active', async () => {
  stubLocation('/')

  const initial = createState({
    lastLocation: {
      path: '/editor/2',
      page: Page.Editor,
    },
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.lastLocation?.page).toBe(Page.Editor)
  expect(store.files.length).toBe(2)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test 2$/)
})

test('open - new file with id', async () => {
  stubLocation('/editor/3')

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

  expect(store.lastLocation?.page).toBe(Page.Editor)
  expect(store.files.length).toBe(3)
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')
})

test('open - existing file', async () => {
  stubLocation('/editor/1')

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

  expect(store.lastLocation?.page).toBe(Page.Editor)
  expect(store.files.length).toBe(2)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Text$/)
})

test('open - share', async () => {
  stubLocation('/editor/1?share=true')

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

  expect(store.lastLocation?.page).toBe(Page.Editor)
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent(/^Text$/)
  })
})

test('open - file with path', async () => {
  stubLocation('/editor/1')
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

  expect(store.lastLocation?.page).toBe(Page.Editor)
  expect(store.files.length).toBe(1)
  expect(store.files[0].path).toBe('file1')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File1$/)
})

test('open - file not found', async () => {
  stubLocation('/editor/1')

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
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({file: 'file2.md'}),
    read_text: () => 'File2',
  })

  const initial = createState()
  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.path).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File2$/)
})

test('open - file arg exists', async () => {
  stubLocation('/')
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
  stubLocation('/')

  mockWindows('main')
  createIpcMock({
    get_args: () => ({newFile: 'file2.md'}),
  })

  const initial = createState()
  const {store, fileService} = createCtrl(initial)
  const baseElement = document.createElement('div')
  const {getByTestId} = render(() => <Main state={store} />, {baseElement})

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.newFile).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Start typing ...$/)
})

test('open - newFile arg - path exists', async () => {
  stubLocation('/')
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
  stubLocation('/')
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
