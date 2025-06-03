import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Box} from '@flatten-js/core'
import type {DB} from '@/db'
import {createState} from '@/state'
import {createCollabMock} from '../util/util'
import {createEditorView, createYUpdate} from '../util/prosemirror-util'
import {EditorService} from '@/services/EditorService'
import {createStore} from 'solid-js/store'
import type {FileService} from '@/services/FileService'
import type {CollabService} from '@/services/CollabService'
import type {ProseMirrorService} from '@/services/ProseMirrorService'
import type {AppService} from '@/services/AppService'
import type {SelectService} from '@/services/SelectService'

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

test('openFile - stop collab', async () => {
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
    collab: createCollabMock({started: true}),
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

  fileService.findFileById.mockImplementation(() => initial.files[1])

  await service.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(false)
})

test('openFile - existing', async () => {
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
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

  fileService.findFileById.mockImplementation(() => initial.files[1])

  await service.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(false)
})

test('openFile - not found', async () => {
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
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

  fileService.findFileById.mockImplementation(() => undefined)

  await service.openFile({id: '123'})
  expect(store.files.length).toBe(3)
  expect(store.files[2].id).toBe('123')
})

test('openFile - share', async () => {
  const file = {
    id: 'room-123',
    ydoc: createYUpdate('room-123', ['Test']),
    lastModified,
    versions: [],
  }

  const initial = createState({
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

  fileService.findFileById.mockImplementation(() => file)

  await service.openFile({id: 'room-123', share: true})
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

  service.clear()

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
