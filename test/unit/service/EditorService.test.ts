import {vi, expect, test, beforeEach} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {Box} from '@tldraw/editor'
import {DB} from '@/db'
import {Ctrl} from '@/services'
import {createState} from '@/state'
import {createCollabMock} from '../util/util'
import {createEditorView, createYUpdate} from '../util/prosemirror-util'
import {EditorService} from '@/services/EditorService'
import {createStore} from 'solid-js/store'

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

beforeEach(() => {
  vi.restoreAllMocks()
})

test('newFile', async () => {
  const ctrl = mockDeep<Ctrl>()
  const [store, setState] = createStore(createState({}))
  const service = new EditorService(ctrl, store, setState)

  const file = await service.newFile()

  expect(file).toBeDefined()
  expect(store.files.length).toBe(1)
  expect(store.files[0].active).toBeFalsy()
})

test('openFile - stop collab', async () => {
  const ctrl = mockDeep<Ctrl>()
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: [], active: true},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
    collab: createCollabMock({started: true}),
  })

  const [store, setState] = createStore(initial)

  const service = new EditorService(ctrl, store, setState)

  ctrl.file.findFileById.mockImplementation(() => initial.files[1])

  await service.openFile('2')
  expect(store.files.length).toBe(2)
  expect(store.files[1].active).toBeTruthy()
  expect(store.collab?.started).toBe(false)
})

test('openFile - existing', async () => {
  const ctrl = mockDeep<Ctrl>()
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: [], active: true},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
    collab: createCollabMock(),
  })

  const [store, setState] = createStore(initial)

  const service = new EditorService(ctrl, store, setState)

  ctrl.file.findFileById.mockImplementation(() => initial.files[1])

  await service.openFile('2')
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBeFalsy()
  expect(store.files[1].active).toBeTruthy()
  expect(store.collab?.started).toBe(false)

  expect(DB.updateFile).toHaveReturnedTimes(2)
})

test('openFile - not found', async () => {
  const ctrl = mockDeep<Ctrl>()
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: [], active: true},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
    collab: createCollabMock(),
  })

  const [store, setState] = createStore(initial)

  const service = new EditorService(ctrl, store, setState)

  ctrl.file.findFileById.mockImplementation(() => undefined)

  await service.openFile('123')
  expect(store.files.length).toBe(3)
  expect(store.files[0].active).toBeFalsy()
  expect(store.files[1].active).toBeFalsy()
  expect(store.files[2].active).toBeTruthy()
  expect(store.files[2].id).toBe('123')
})

test('openFile - share', async () => {
  const ctrl = mockDeep<Ctrl>()
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

  const service = new EditorService(ctrl, store, setState)

  ctrl.file.findFileById.mockImplementation(() => file)

  await service.openFile('room-123', true)
  expect(store.files.length).toBe(1)
  expect(store.files[0].active).toBeTruthy()
  expect(store.files[0].id).toBe('room-123')
  expect(store.collab?.provider?.roomname).toBe('editor/room-123')
  expect(store.collab?.started).toBeTruthy()
})

test('clear - with text', async () => {
  const ctrl = mockDeep<Ctrl>()
  const editorView = createEditorView(['Test'])

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Test']),
    lastModified,
    versions: [],
    editorView,
  }

  Object.defineProperty(ctrl.file, 'currentFile', {get: vi.fn().mockReturnValue(file)})

  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new EditorService(ctrl, store, setState)

  expect(editorView.state.doc.textContent).toBe('Test')

  service.clear()

  expect(editorView.state.doc.textContent).toBe('')
})

test('selectBox', async () => {
  const ctrl = mockDeep<Ctrl>()
  const editorView = createEditorView(['Test'])

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Test']),
    lastModified,
    versions: [],
    editorView,
  }

  Object.defineProperty(ctrl.file, 'currentFile', {get: vi.fn().mockReturnValue(file)})

  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new EditorService(ctrl, store, setState)

  const box = new Box(0, 0, 100, 100)
  service.selectBox(box, true, false)

  expect(ctrl.select.selectBox).toBeCalledWith(box, editorView, true, false)
})
