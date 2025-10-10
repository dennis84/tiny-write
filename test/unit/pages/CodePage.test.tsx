import {fireEvent, render, waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Main} from '@/components/Main'
import type {DB} from '@/db'
import {createCtrl} from '@/services'
import {createState, Page} from '@/state'
import {createYUpdate} from '../testutil/codemirror-util'
import {createIpcMock, expectToBeDefined, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const lastModified = new Date()

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
})

test('init - new code page', async () => {
  stubLocation('/code')

  const initial = createState()

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('new_code_page')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Code)
  expect(store.files.length).toBe(0)
  expect(fileService.currentFileId).toBe(undefined)

  getByTestId('new_file').click()

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.files.length).toBe(1)
})

test('init - file not found', async () => {
  stubLocation('/code/1')

  const initial = createState()

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('new_code_page')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Code)
  expect(store.files.length).toBe(0)
  expect(fileService.currentFileId).toBe(undefined)
})

test('init - open last location', async () => {
  stubLocation('/')

  const initial = createState({
    location: {
      codeId: '1',
      page: Page.Code,
    },
    files: [
      {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
      {
        id: '2',
        ydoc: createYUpdate('2', 'Code2'),
        lastModified,
        versions: [],
        code: true,
      },
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Code)
  expect(store.files.length).toBe(2)
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('init - existing file', async () => {
  stubLocation('/code/1')

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
      {id: '2', ydoc: createYUpdate('2', 'Code2'), lastModified, versions: [], code: true},
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Code)
  expect(store.files.length).toBe(2)
  expect(fileService.currentFileId).toBe('1')
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('init - join url', async () => {
  stubLocation('/code?join=1')

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
      {id: '2', ydoc: createYUpdate('2', 'Code2'), lastModified, versions: [], code: true},
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('new_code_page')).toBeDefined()
  })

  getByTestId('join_file').click()

  await waitFor(() => {
    expectToBeDefined(store.collab)
    expect(store.collab.provider).toBeDefined()
    store.collab.provider.synced = true
  })

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Code)
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)

  await waitFor(() => {
    expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
  })
})

test('init - file arg', async () => {
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    get_args: () => ({file: 'code1.yaml'}),
    read_text: () => 'Code1',
  })

  const initial = createState({args: {file: 'code1.yaml'}})
  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.path).toBe('code1.yaml')
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('open', async () => {
  stubLocation('/code/1')
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    read_text: () => 'Code1',
  })

  const initial = createState({
    files: [
      {
        id: '1',
        path: 'code1.yaml',
        ydoc: createYUpdate('1', 'Code1'),
        lastModified,
        versions: [],
        code: true,
      },
      {
        id: '2',
        path: 'code2.yaml',
        ydoc: createYUpdate('2', 'Code2'),
        lastModified,
        versions: [],
        code: true,
      },
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId, getAllByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(fileService.currentFile?.path).toBe('code1.yaml')
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')

  fireEvent.click(getByTestId('floating_navbar_menu_open'))
  fireEvent.click(getAllByTestId('tree_link_title')[1])

  await waitFor(() => {
    expect(fileService.currentFile?.id).toBe('2')
  })

  expect(fileService.currentFile?.path).toBe('code2.yaml')
})
