import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {createState, Mode} from '@/state'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {createYUpdate} from '../util/codemirror-util'
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
  vi.stubGlobal('location', new URL('http://localhost:3000/code/1'))

  const initial = createState()

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(1)
  expect(store.files[0].active).toBeTruthy()
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('')
})

test('open - active', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))

  const initial = createState({
    mode: Mode.Code,
    files: [
      {id: '1', ydoc: createYUpdate('1', 'Code1'), lastModified, versions: [], code: true},
      {
        id: '2',
        ydoc: createYUpdate('2', 'Code2'),
        lastModified,
        versions: [],
        code: true,
        active: true,
      },
    ],
  })

  const {store, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeFalsy()
  expect(store.files[1].active).toBeTruthy()
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code2')
})

test('open - new file with id', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/code/3'))

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

  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(3)
  expect(store.files[0].active).toBeFalsy()
  expect(store.files[1].active).toBeFalsy()
  expect(store.files[2].active).toBeTruthy()
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('')
})

test('open - existing file', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/code/1'))

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

  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeTruthy()
  expect(store.files[1].active).toBeFalsy()
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
})

test('open - share', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/code/1?share=true'))

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

  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeTruthy()
  expect(store.files[1].active).toBeFalsy()
  expect(store.collab?.started).toBe(true)

  await waitFor(() => {
    expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Code1')
  })
})

test('open - file arg', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))
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
