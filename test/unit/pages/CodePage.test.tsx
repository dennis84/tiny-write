import {fireEvent, waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {createState} from '@/state'
import {Page} from '@/types'
import {createYUpdate} from '../testutil/codemirror-util'
import {createIpcMock, renderMain, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({
  DB: mock({
    getFiles: vi.fn(),
  }),
}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const lastModified = new Date()

beforeEach(() => {
  vi.resetAllMocks()
  clearMocks()
})

test('init - new code page', async () => {
  stubLocation('/code')

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(ctrl.fileService.resourceState).toEqual('ready')
  })

  await waitFor(() => {
    expect(getByTestId('new_code_page')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Code)
  expect(ctrl.fileService.files.length).toBe(0)
  expect(ctrl.fileService.currentFileId).toBe(undefined)

  getByTestId('new_file').click()

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.fileService.files.length).toBe(1)
})

test('init - file not found', async () => {
  stubLocation('/code/1')

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(ctrl.fileService.resourceState).toEqual('ready')
    expect(getByTestId('new_code_page')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Code)
  expect(ctrl.fileService.files.length).toBe(0)
  expect(ctrl.fileService.currentFileId).toBe(undefined)
})

test('init - open last location', async () => {
  stubLocation('/')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {
      id: '2',
      ydoc: createYUpdate('2', 'Code2'),
      lastModified,
      versions: [],
      code: true,
    },
    {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
  ])

  const initial = createState({
    lastLocation: {
      pathname: '/code/1',
    },
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Code)
  expect(ctrl.fileService.files.length).toBe(2)
  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('init - existing file', async () => {
  stubLocation('/code/1')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
    {id: '2', ydoc: createYUpdate('2', 'Code2'), lastModified, versions: [], code: true},
  ])

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Code)
  expect(ctrl.fileService.files.length).toBe(2)
  expect(ctrl.fileService.currentFileId).toBe('1')
  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('init - join url', async () => {
  stubLocation('/code?join=1')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
    {id: '2', ydoc: createYUpdate('2', 'Code2'), lastModified, versions: [], code: true},
  ])

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(ctrl.fileService.resourceState).toEqual('ready')
    expect(getByTestId('new_code_page')).toBeDefined()
  })

  getByTestId('join_file').click()

  await waitFor(() => {
    expect(ctrl.collabService.started()).toBe(true)
    expect(ctrl.collabService.provider).toBeDefined()
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Code)
  expect(ctrl.fileService.files.length).toBe(2)
  expect(ctrl.collabService.started()).toBe(true)

  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
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
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.fileService.currentFile?.path).toBe('code1.yaml')
  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('open', async () => {
  stubLocation('/code/1')
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    read_text: () => 'Code1',
  })

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {
      id: '1',
      ydoc: createYUpdate('1', 'Code1'),
      lastModified,
      versions: [],
      code: true,
    },
    {
      id: '2',
      ydoc: createYUpdate('2', 'Code2'),
      lastModified,
      versions: [],
      code: true,
    },
  ])

  const initial = createState()

  const {getByTestId, getAllByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.fileService.currentFile?.id).toBe('1')
  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')

  fireEvent.click(getByTestId('navbar_menu_open'))
  fireEvent.click(getAllByTestId('tree_link_title')[1])

  await waitFor(() => {
    expect(ctrl.fileService.currentFile?.id).toBe('2')
  })

  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code2')
})
