import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {fireEvent, render, waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {createState, Page} from '@/state'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {createYUpdate} from '../util/codemirror-util'
import {createIpcMock, stubLocation} from '../util/util'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const lastModified = new Date()

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
})

test('init - new file', async () => {
  stubLocation('/code/1')

  const initial = createState()

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.lastLocation?.page).toBe(Page.Code)
  expect(store.files.length).toBe(1)
  expect(fileService.currentFileId).toBe('1')
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('')
})

test('init - active', async () => {
  stubLocation('/')

  const initial = createState({
    lastLocation: {
      path: '/code/1',
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

  expect(store.lastLocation?.page).toBe(Page.Code)
  expect(store.files.length).toBe(2)
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('init - new file with id', async () => {
  stubLocation('/code/3')

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

  expect(store.lastLocation?.page).toBe(Page.Code)
  expect(store.files.length).toBe(3)
  expect(fileService.currentFileId).toBe('3')
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('')
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

  expect(store.lastLocation?.page).toBe(Page.Code)
  expect(store.files.length).toBe(2)
  expect(fileService.currentFileId).toBe('1')
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('init - share', async () => {
  stubLocation('/code/1?share=true')

  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
      {id: '2', ydoc: createYUpdate('2', 'Code2'), lastModified, versions: [], code: true},
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(store.collab?.provider).toBeDefined()
    store.collab!.provider.synced = true
  })

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.lastLocation?.page).toBe(Page.Code)
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
