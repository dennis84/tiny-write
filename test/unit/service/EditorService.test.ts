import {Box} from '@flatten-js/core'
import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {DB} from '@/db'
import type {CollabService} from '@/services/CollabService'
import {EditorService} from '@/services/EditorService'
import type {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import type {ProseMirrorService} from '@/services/ProseMirrorService'
import type {SelectService} from '@/services/SelectService'
import type {ToastService} from '@/services/ToastService'
import {createState} from '@/state'
import {createEditorView, createSubdoc, createYUpdate} from '../testutil/prosemirror-util'

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
const toastService = mock<ToastService>()
const selectService = mock<SelectService>()

beforeEach(() => {
  vi.resetAllMocks()
})

test('init - existing', async () => {
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
  })

  const [store, setState] = createStore(initial)
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>({editorId: '2'})

  fileService.findFileById.mockReturnValue(initial.files[1])
  collabService.getSubdoc.mockReturnValue(createSubdoc('2', []))

  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    toastService,
    selectService,
    locationService,
    store,
    setState,
  )

  await service.init('2')
  expect(store.files.length).toBe(2)
})

test('init - not found', async () => {
  const initial = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified, versions: []},
      {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, versions: []},
    ],
  })

  const [store, setState] = createStore(initial)
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>({canvasId: '3'})

  fileService.findFileById.mockReturnValue(undefined)

  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    toastService,
    selectService,
    locationService,
    store,
    setState,
  )

  expect(service.init('3')).rejects.toThrowError(/^File not found.*/)
})

test('init - share', async () => {
  const file = {
    id: 'room-123',
    ydoc: createYUpdate('room-123', ['Test']),
    lastModified,
    versions: [],
  }

  const initial = createState({
    files: [file],
  })

  const [store, setState] = createStore(initial)
  const fileService = mock<FileService>()
  const locationService = mock<LocationService>({
    editorId: 'room-123',
    state: {share: true},
  })

  fileService.findFileById.mockReturnValue(file)
  collabService.getSubdoc.mockReturnValue(createSubdoc('room-123', []))

  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    toastService,
    selectService,
    locationService,
    store,
    setState,
  )

  await service.init('room-123')
  expect(store.files.length).toBe(1)
  expect(store.files[0].id).toBe('room-123')
})

test('clear - with text', async () => {
  const editorView = createEditorView(['Test'])
  const fileService = mock<FileService>({currentFile: undefined})
  const locationService = mock<LocationService>()

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Test']),
    lastModified,
    versions: [],
    editorView,
  }

  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(file)

  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    toastService,
    selectService,
    locationService,
    store,
    setState,
  )

  expect(editorView.state.doc.textContent).toBe('Test')

  await service.clear()

  expect(editorView.state.doc.textContent).toBe('')
})

test('selectBox', async () => {
  const editorView = createEditorView(['Test'])
  const fileService = mock<FileService>({currentFile: undefined})
  const locationService = mock<LocationService>()

  const file = {
    id: '1',
    ydoc: createYUpdate('1', ['Test']),
    lastModified,
    versions: [],
    editorView,
  }

  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(file)

  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new EditorService(
    fileService,
    collabService,
    proseMirrorService,
    toastService,
    selectService,
    locationService,
    store,
    setState,
  )

  const box = new Box(0, 0, 100, 100)
  service.selectBox(box, true, false)

  expect(selectService.selectBox).toBeCalledWith(box, editorView, true, false)
})
