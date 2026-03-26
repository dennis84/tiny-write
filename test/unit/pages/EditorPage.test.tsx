import {waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {createState} from '@/state'
import {Page} from '@/types'
import {createYUpdate} from '../testutil/prosemirror-util'
import {createIpcMock, renderMain, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const lastModified = new Date()

beforeEach(() => {
  vi.resetAllMocks()
  clearMocks()
})

test('init - new file on root page', async () => {
  stubLocation('/')

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(1)
})

test('init - new file page', async () => {
  stubLocation('/editor')

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('new_editor_page')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(0)
})

test('init - open last location', async () => {
  stubLocation('/')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, versions: []},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
  ])

  const initial = createState({
    lastLocation: {
      pathname: '/editor/2',
    },
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(2)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test 2$/)
})

test('init - file not found', async () => {
  stubLocation('/editor/3')

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('new_editor_page')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(0)
})

test('init - existing file', async () => {
  stubLocation('/editor/1')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
  ])

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(2)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Text$/)
})

test('init - join', async () => {
  stubLocation('/editor?join=1')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
  ])

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(ctrl.fileService.resourceState).toEqual('ready')
    expect(getByTestId('new_editor_page')).toBeDefined()
  })

  getByTestId('join_editor').click()

  await waitFor(() => {
    expect(ctrl.collabService.provider).toBeDefined()
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(2)
  expect(ctrl.collabService.started()).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Text$/)
})

test('init - file arg', async () => {
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    read_text: () => 'File2',
  })

  const initial = createState({
    args: {file: 'file2.md'},
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.fileService.currentFile?.path).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File2$/)
})

test('init - newFile arg', async () => {
  stubLocation('/')

  mockWindows('main')
  createIpcMock()

  const initial = createState({
    args: {newFile: 'file2.md'},
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.fileService.currentFile?.newFile).toBe('file2.md')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Start typing ...$/)
})

test('open - file with path', async () => {
  stubLocation('/editor')

  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    read_text: (path) => (path === 'file1' ? '# File1' : '# File2'),
  })

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(ctrl.fileService.resourceState).toEqual('ready')
  })

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Text']),
    lastModified,
    versions: [],
    path: 'file1',
  }

  await ctrl.fileService.addFile(file)

  ctrl.locationService.openItem(file)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Editor)
  expect(ctrl.fileService.files.length).toBe(1)
  expect(ctrl.fileService.files[0].path).toBe('file1')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^File1$/)
})

test('open - read file - file not found', async () => {
  stubLocation('/editor')

  vi.stubGlobal('__TAURI__', {})

  mockWindows('main')
  createIpcMock({
    resolve_path: () => {
      throw new Error('Fail')
    },
  })

  const initial = createState()

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(ctrl.fileService.resourceState).toEqual('ready')
  })

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Text']),
    lastModified,
    versions: [],
    path: 'file1',
  }

  await ctrl.fileService.addFile(file)

  ctrl.locationService.openItem(file)

  await waitFor(() => {
    expect(getByTestId('new_editor_page')).toBeDefined()
  })
})
