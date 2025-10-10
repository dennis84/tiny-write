import {Box} from '@flatten-js/core'
import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {DB} from '@/db'
import type {AppService} from '@/services/AppService'
import type {CollabService} from '@/services/CollabService'
import {EditorService} from '@/services/EditorService'
import type {FileService} from '@/services/FileService'
import type {ProseMirrorService} from '@/services/ProseMirrorService'
import type {SelectService} from '@/services/SelectService'
import {createState, Page} from '@/state'
import {createEditorView, createYUpdate} from '../testutil/prosemirror-util'
import {createCollabMock} from '../testutil/util'

vi.stubGlobal('location', {
  pathname: '',
  reload: vi.fn(),
})

const WsMock = vi.fn(() => ({
  close: vi.fn(),
}))

vi.stubGlobal('WebSocket', WsMock)

vi.mock('mermaid', () => ({}))

vi.mock('@/db', () => ({DB: mock<DB>()}))

const lastModified = new Date()

const collabService = mock<CollabService>()
const proseMirrorService = mock<ProseMirrorService>()
const appService = mock<AppService>()
const selectService = mock<SelectService>()

beforeEach(() => {
  vi.restoreAllMocks()
})

test('init - existing', async () => {
  const initial = createState({
    location: {page: Page.Editor, editorId: '2'},
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
    collab: createCollabMock({started: true}), // stop collab if active
  })

  const [store, setState] = createStore(initial)
  const fileService = mock<FileService>()

  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    appService,
    selectService,
    store,
    setState,
  )

  const file = initial.files[1]
  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(file)})

  await service.init()
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(false)
})

test('init - no currentFile', async () => {
  const initial = createState({
    location: {page: Page.Canvas, canvasId: '3'},
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
    collab: createCollabMock({id: '3'}),
  })

  const [store, setState] = createStore(initial)
  const fileService = mock<FileService>()

  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    appService,
    selectService,
    store,
    setState,
  )

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(undefined)})

  expect(service.init()).rejects.toThrowError(/^File not found.*/)
})

test('init - share', async () => {
  const file = {
    id: 'room-123',
    ydoc: createYUpdate('room-123', ['Test']),
    lastModified,
    versions: [],
  }

  const initial = createState({
    location: {page: Page.Editor, editorId: 'room-123', share: true},
    files: [file],
    collab: createCollabMock(),
  })

  const [store, setState] = createStore(initial)
  const fileService = mock<FileService>()

  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    appService,
    selectService,
    store,
    setState,
  )

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(file)})

  await service.init()
  expect(store.files.length).toBe(1)
  expect(store.files[0].id).toBe('room-123')
  expect(store.collab?.provider?.roomname).toBe('editor/room-123')
  expect(store.collab?.started).toBeTruthy()
})

test('clear - with text', async () => {
  const editorView = createEditorView(['Test'])
  const fileService = mock<FileService>()

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Test']),
    lastModified,
    versions: [],
    editorView,
  }

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(file)})

  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    appService,
    selectService,
    store,
    setState,
  )

  expect(editorView.state.doc.textContent).toBe('Test')

  await service.clear()

  expect(editorView.state.doc.textContent).toBe('')
})

test('selectBox', async () => {
  const editorView = createEditorView(['Test'])
  const fileService = mock<FileService>()

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Test']),
    lastModified,
    versions: [],
    editorView,
  }

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(file)})

  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    appService,
    selectService,
    store,
    setState,
  )

  const box = new Box(0, 0, 100, 100)
  service.selectBox(box, true, false)

  expect(selectService.selectBox).toBeCalledWith(box, editorView, true, false)
})
