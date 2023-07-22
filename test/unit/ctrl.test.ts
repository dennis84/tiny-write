import {vi, expect, test, beforeEach} from 'vitest'
import * as db from '@/db'
import {createYUpdateAsString, getText, insertText, waitFor, pause} from './util'

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.stubGlobal('location', ({
  pathname: '',
  reload: vi.fn(),
}))

vi.mock('mermaid', () => ({}))

vi.mock('@/db', () => ({
  getCanvases: vi.fn(),
  getMeta: vi.fn(),
  setMeta: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getWindow: vi.fn(),
  setWindow: vi.fn(),
  getFiles: vi.fn(),
  deleteFile: vi.fn(),
  updateFile: vi.fn(),
  setSize: vi.fn(),
  getSize: vi.fn(),
  deleteDatabase: vi.fn(),
}))

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn((_, roomname) => ({
    roomname,
    awareness: {
      setLocalStateField: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getLocalState: vi.fn(),
    },
    disconnect: vi.fn(),
    connect: vi.fn(),
    on: vi.fn(),
  }))
}))

import {createCtrl} from '@/services'
import {createState, Version} from '@/state'

beforeEach(() => {
  vi.restoreAllMocks()
})

const lastModified = new Date()

test('init', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.collab?.ydoc).not.toBe(undefined)
})

test('init - new file if no id', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Text'), lastModified},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(3)
  expect(getText(ctrl)).toBe('')
  expect(ctrl.file.currentFile?.id).not.toBe('1')
  expect(ctrl.file.currentFile?.id).not.toBe('2')
})

test('init - existing file', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(2)
  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('init - join', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '3'}}))
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(3)
  expect(ctrl.file.currentFile?.id).toBe('3')
  expect(getText(ctrl)).toBe('')
})

test('init - dir', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState({args: {dir: ['~/Desktop/Aaaa.md']}}))
  await ctrl.app.init()

  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(store.args?.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('init - dir no current file', async () => {
  const {ctrl, store} = createCtrl(createState({
    args: {dir: ['~/Desktop/Aaaa.md']},
  }))

  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(0)
  expect(ctrl.file.currentFile).toBe(undefined)
  expect(store.args?.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('newFile', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  const id = ctrl.file.currentFile?.id
  insertText(ctrl, 'Test')
  expect(getText(ctrl)).toEqual('Test')

  await ctrl.editor.newFile()
  expect(ctrl.file.currentFile?.id).not.toBe(id)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(store.files.length).toBe(2)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files[1].ydoc).not.toBe(undefined)
})

test('newFile - empty', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  await ctrl.editor.newFile()
  expect(store.files.length).toBe(1)
  await ctrl.editor.newFile()
  expect(store.files.length).toBe(1)
})

test('newFile - collab', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  insertText(ctrl, 'Test')

  ctrl.collab.startCollab()
  const id = ctrl.file.currentFile?.id

  await ctrl.editor.newFile()
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.id).not.toEqual(id)
  expect(store.collab?.started).toBe(false)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files.find((f) => f.id === id)).not.toBeNull()
})

test('openFile - existing', async () => {
  const updateFileSpy = vi.spyOn(db, 'updateFile')
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  updateFileSpy.mockClear()

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
  })

  expect(store.files[0].active).toBe(true)
  expect(store.files[1].active).toBe(false)

  await ctrl.editor.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBe(false)
  expect(store.files[1].active).toBe(true)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)

  expect(updateFileSpy).toHaveReturnedTimes(2)
  ctrl.editor.renderEditor(target)
  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('openFile - not found', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  const id = ctrl.file.currentFile?.id
  expect(store.files.length).toBe(1)
  await ctrl.editor.openFile({id: '123'})
  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.id).toBe(id)
})

test('openFile - delete empty', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', ''), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  await ctrl.editor.openFile({id: '2'})
  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('openFile - open collab', async () => {
  const file = {
    id: 'room-123',
    ydoc: createYUpdateAsString('room-123', 'Test'),
    lastModified,
  }

  vi.spyOn(db, 'getFiles').mockResolvedValue([file])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(ctrl.file.currentFile?.id).not.toBe('room-123')
  expect(store.collab?.provider?.roomname).toBe(ctrl.file.currentFile?.id)

  await ctrl.editor.openFile(file)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
    expect(ctrl.file.currentFile?.id).toBe('room-123')
    expect(store.files.length).toBe(1)
    expect(store.collab?.provider?.roomname).toBe('room-123')
  })
})

test('openFile - open from collab', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(2)
  ctrl.collab.startCollab()
  await pause(10)

  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)

  await ctrl.editor.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(false)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test 2')
  })
})

test('discard - open collab', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: 'room-123', ydoc: createYUpdateAsString('room-123', 'Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())

  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(2)

  await ctrl.editor.discard()
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
    expect(ctrl.file.currentFile?.id).toBe('room-123')
    expect(store.files.length).toBe(1)
  })
})

test('discard - with text', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  insertText(ctrl, '111')
  expect(store.files.length).toBe(2)

  await ctrl.editor.discard()
  expect(getText(ctrl)).toBe('')
  expect(store.files.length).toBe(2)

  await ctrl.editor.discard()
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
    expect(store.files.length).toBe(1)
  })
})

test('discard - close collab', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(2)

  ctrl.collab.startCollab()
  expect(store.files.length).toBe(2)
  insertText(ctrl, '111')

  await ctrl.editor.discard()
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
    expect(store.files.length).toBe(1)
  })
})

test('discard - error', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(ctrl.file.currentFile?.id).toBe('1')
  expect(store.files.length).toBe(1)

  const error = new Error('fail')
  ctrl.app.setError(error)
  expect(store.error?.id).toBe('exception')

  await ctrl.editor.discard()
  expect(store.error).toBe(undefined)
  expect(ctrl.file.currentFile).toBe(undefined)
  expect(store.files.length).toBe(0)
})

test('deleteFile - unused', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
  })

  expect(store.files.length).toBe(2)

  await ctrl.editor.deleteFile({id: '2'})
  expect(store.files.length).toBe(1)
  expect(getText(ctrl)).toBe('Test')
})

test('deleteFile - current', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
  })

  expect(store.files.length).toBe(2)
  await ctrl.editor.deleteFile({id: '1'})
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(store.files.length).toBe(1)
    expect(getText(ctrl)).toBe('Test2')
  })
})

test('reset', async () => {
  const dbSpy = vi.spyOn(db, 'deleteDatabase')
  const reloadSpy = vi.spyOn(window.location, 'reload')

  const error = new Error('fail')
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  ctrl.app.setError(error)
  expect(store.error?.id).toBe('exception')

  await ctrl.app.reset()
  expect(dbSpy).toHaveBeenCalledTimes(1)
  expect(reloadSpy).toHaveBeenCalledTimes(1)
})

test('startCollab - from empty state', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

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
  ctrl.editor.renderEditor(target)

  expect(ctrl.file.currentFile?.editorView).not.toBe(undefined)
  insertText(ctrl, 'Test')

  ctrl.collab.startCollab()
  expect(getText(ctrl)).toBe('Test')
  expect(ctrl.file.currentFile?.id).not.toBe(undefined)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('startCollab - join new file', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '2'}}))
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(getText(ctrl)).toBe('')
  expect(ctrl.file.currentFile?.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('startCollab - join existing file', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '2'}}))
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  // Not sure if updateText should be called.
  expect(getText(ctrl)).toBe('')
  expect(ctrl.file.currentFile?.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('applyVersion', async () => {
  const getVersions = () =>
    store.collab?.ydoc?.getArray('versions').toArray() as Version[]

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  insertText(ctrl, 'Test')
  expect(getText(ctrl)).toBe('Test')
  expect(getVersions().length).toBe(0)

  ctrl.changeSet.addVersion()
  await pause(10)

  expect(getVersions().length).toBe(1)
  insertText(ctrl, '123')
  expect(getText(ctrl)).toBe('Test123')

  ctrl.changeSet.renderVersion(getVersions()[0])
  await pause(10)

  expect(getText(ctrl)).toBe('Test')

  ctrl.changeSet.applyVersion(getVersions()[0])
  await pause(10)

  expect(getText(ctrl)).toBe('Test')
})
