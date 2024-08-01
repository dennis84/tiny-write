import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Box} from '@tldraw/editor'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {createState} from '@/state'
import {waitFor, pause, renderEditor} from '../util/util'
import {createYUpdate, getText, insertText} from '../util/prosemirror-util'

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.stubGlobal('location', ({
  pathname: '',
  reload: vi.fn(),
}))

const WsMock = vi.fn(() => ({
  close: vi.fn()
}))

vi.stubGlobal('WebSocket', WsMock)

vi.mock('mermaid', () => ({}))

vi.mock('@/db', () => ({DB: mock<DB>()}))

beforeEach(() => {
  vi.restoreAllMocks()
})

const lastModified = new Date()

test('init', async () => {
  const {ctrl, store} = createCtrl(createState())
  await ctrl.app.init()
  expect(store.collab?.ydoc).not.toBe(undefined)
})

test('init - new file if no id', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Text']), lastModified},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile
  expect(currentFile).toBeDefined()

  expect(currentFile?.id).not.toBe('1')
  expect(currentFile?.id).not.toBe('2')
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(store.files.length).toBe(3)
  expect(getText(ctrl)).toBe('')
})

test('init - existing file', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile

  expect(store.files.length).toBe(2)
  expect(currentFile?.id).toBe('2')

  await renderEditor(currentFile!.id, ctrl, target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('init - join', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '3'}}))
  const target = document.createElement('div')
  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile

  expect(store.files.length).toBe(3)
  expect(currentFile?.id).toBe('3')

  await renderEditor(currentFile!.id, ctrl, target, true)

  expect(getText(ctrl)).toBe('')
})

test('newFile', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile
  await renderEditor(currentFile!.id, ctrl, target)

  insertText(ctrl, 'Test')
  expect(getText(ctrl)).toEqual('Test')

  await ctrl.editor.newFile()
  expect(ctrl.file.currentFile?.id).not.toBe(currentFile?.id)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(store.files.length).toBe(2)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files[1].ydoc).not.toBe(undefined)
})

test('newFile - empty', async () => {
  const {ctrl, store} = createCtrl(createState())
  await ctrl.app.init()

  await ctrl.editor.newFile()
  expect(store.files.length).toBe(2)
  await ctrl.editor.newFile()
  expect(store.files.length).toBe(3)
})

test('newFile - collab', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile
  await renderEditor(currentFile!.id, ctrl, target)

  insertText(ctrl, 'Test')
  ctrl.collab.startCollab()

  await ctrl.editor.newFile()
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.id).not.toEqual(currentFile?.id)
  expect(store.collab?.started).toBe(false)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files.find((f) => f.id === currentFile?.id)).not.toBeNull()
})

test('openFile - existing', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()

  let currentFile = ctrl.file.currentFile
  expect(currentFile?.id).toBe('1')

  await renderEditor(currentFile!.id, ctrl, target)

  vi.mocked(DB.updateFile).mockClear()

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
  })

  expect(store.files[0].active).toBe(true)
  expect(store.files[1].active).toBe(false)

  await ctrl.editor.openFile('2')
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBe(false)
  expect(store.files[1].active).toBe(true)
  expect(ctrl.file.currentFile?.id).toBe('2')
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)

  expect(DB.updateFile).toHaveReturnedTimes(2)

  currentFile = ctrl.file.currentFile
  expect(currentFile?.id).toBe('2')

  await renderEditor(currentFile!.id, ctrl, target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('openFile - not found', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile
  await renderEditor(currentFile!.id, ctrl, target)

  expect(store.files.length).toBe(1)
  await ctrl.editor.openFile('123')
  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.id).toBe(currentFile?.id)
})

test('openFile - not delete empty', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', []), lastModified, active: true},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  const currentFile = ctrl.file.currentFile
  expect(currentFile?.id).toBe('1')

  await renderEditor(currentFile!.id, ctrl, target)

  await ctrl.editor.openFile('2')
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.id).toBe('2')

  await renderEditor('2', ctrl, target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('openFile - open collab', async () => {
  const file = {
    id: 'room-123',
    ydoc: createYUpdate('room-123', ['Test']),
    lastModified,
  }

  vi.mocked(DB.getFiles).mockResolvedValue([file])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  expect(ctrl.file.currentFile?.id).not.toBe('room-123')
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(store.collab?.provider?.roomname).toBe('editor/' + ctrl.file.currentFile?.id)

  await ctrl.editor.openFile(file.id)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.id).toBe('room-123')

  renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
    expect(store.files.length).toBe(2)
    expect(store.collab?.provider?.roomname).toBe('editor/room-123')
  })
})

test('openFile - open from collab', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  expect(ctrl.file.currentFile?.id).toBe('1')

  await renderEditor('1', ctrl, target)

  expect(store.files.length).toBe(2)
  ctrl.collab.startCollab()
  await pause(10)

  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)

  await ctrl.editor.openFile('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(false)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.id).toBe('2')
  await renderEditor('2', ctrl, target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('clear - with text', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  insertText(ctrl, '111')
  expect(store.files.length).toBe(2)

  await ctrl.editor.clear()
  expect(getText(ctrl)).toBe('')
})

test('reset', async () => {
  const error = new Error('fail')
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  ctrl.app.setError({error})
  expect(store.error?.id).toBe('exception')

  await ctrl.app.reset()
  expect(DB.deleteDatabase).toHaveBeenCalledTimes(1)
})

test('startCollab - from empty state', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  ctrl.collab.startCollab()
  expect(getText(ctrl)).toBe('')
  expect(ctrl.file.currentFile?.id).not.toBe(undefined)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)

  ctrl.collab.stopCollab()
})

test('startCollab - with text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(ctrl.file.currentFile?.editorView).not.toBe(undefined)
  insertText(ctrl, 'Test')

  ctrl.collab.startCollab()
  expect(getText(ctrl)).toBe('Test')
  expect(ctrl.file.currentFile?.id).not.toBe(undefined)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('startCollab - join new file', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '2'}}))
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target, true)

  expect(getText(ctrl)).toBe('')
  expect(ctrl.file.currentFile?.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('startCollab - join existing file', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', ydoc: createYUpdate('2', ['Test 2']), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '2'}}))
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor('2', ctrl, target, true)

  expect(getText(ctrl)).toBe('Test 2')
  expect(ctrl.file.currentFile?.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('selectBox', async () => {
  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  insertText(ctrl, 'Test')
  expect(ctrl.file.currentFile?.editorView?.state.selection.empty).toBe(true)

  ctrl.editor.selectBox(new Box(0, 0, 100, 100), true, false)
  expect(ctrl.file.currentFile?.editorView?.state.selection.empty).toBe(false)
})
