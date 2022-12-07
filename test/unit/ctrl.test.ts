import {vi, expect, test} from 'vitest'

vi.stubGlobal('d3', vi.fn(() => ({
  curveLinear: () => undefined
})))

import {createCtrl} from '@/ctrl'
import {createState} from '@/state'

const lastModified = new Date()

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('@/remote', () => ({
  getArgs: async () => ({}),
  resolvePath: async ([path]) => path,
  getFileLastModified: async () => lastModified,
  readFile: async (path: string) => {
    return path === 'file1' ? '# File1' : ''
  },
  log: () => undefined,
  updateWindow: () => undefined,
  show: () => undefined,
}))

vi.mock('idb-keyval', () => ({
  get: async () => undefined,
  set: async () => undefined,
}))

vi.mock('y-websocket', () => ({WebsocketProvider: class {
  awareness = {
    setLocalStateField: () => undefined,
    on: () => undefined,
    off: () => undefined,
    getLocalState: () => undefined,
  }
  disconnect() { /**/ }
  connect() { /**/ }
}}))

const createText = (text) => ({
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}]
  },
  selection: {
    type: 'text',
    anchor: 1,
    head: 1
  }
})

const text = createText('Test')

test('setState', () => {
  const [store, ctrl] = createCtrl(createState())
  ctrl.setState({fullscreen: true})
  expect(store.fullscreen).toBe(true)
})

test('init', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.collab.ydoc).not.toBe(undefined)
})

test('newFile', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('Test')
  store.editorView.dispatch(tr)
  expect(store.editorView.state.doc.textContent).toEqual('Test')
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toEqual('')
  expect(store.files[0].ydoc).not.toBe(undefined)
})

test('newFile - empty', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.newFile()
  await ctrl.newFile()
  expect(store.files.length).toBe(0)
})

test('newFile - collab', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('Test')
  store.editorView.dispatch(tr)
  await ctrl.startCollab()
  const room = store.collab.room
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toEqual('')
  expect(store.collab.started).toBe(false)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files[0].room).toEqual(room)
  expect(store.collab.room).not.toEqual(room)
})

test('openFile', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({text})
  expect(store.files.length).toBe(0)
  expect(store.editorView.state.toJSON().doc).toEqual(text.doc)
})

test('openFile - add to files', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('Test')
  store.editorView.dispatch(tr)
  await ctrl.openFile({text})
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.toJSON().doc).toEqual(text.doc)
})

test('openFile - from files', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [
      {text},
      {text: createText('Test 2')},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({text})
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toBe('Test')
})

test('openFile - path in files', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [
      {path: 'file1', lastModified: lastModified.toISOString()},
      {path: 'file2'},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toBe('File1')
  expect(store.path).toBe('file1')
  expect(store.lastModified).toEqual(lastModified)
})

test('openFile - push path to files', async () => {
  const [store, ctrl] = createCtrl(createState({path: 'file2'}))

  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('Test')
  store.editorView.dispatch(tr)
  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  expect(store.files[0].path).toBe('file2')
  expect(store.editorView.state.doc.textContent).toBe('File1')
  expect(store.path).toBe('file1')
})

test('openFile - path and text', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({text, path: 'file1'})
  expect(store.editorView.state.doc.textContent).toBe('File1')
})

test('openFile - open collab', async () => {
  const file = {text, room: 'room-123'}
  const [store, ctrl] = createCtrl(createState({files: [file]}))
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile(file)
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(0)
  expect(store.collab.room).toBe('room-123')
})

test('discard - with path', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{path: 'file1'}],
    path: 'file2',
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(1)
  await ctrl.discard()
  expect(store.editorView.state.doc.textContent).toBe('File1')
  expect(store.path).toBe('file1')
  expect(store.files.length).toBe(0)
})

test('discard - open collab', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{text, room: 'room-123'}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.discard()

  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(0)
  expect(store.collab.room).toBe('room-123')
})

test('discard - with text', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{text}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('111')
  store.editorView.dispatch(tr)
  await ctrl.discard()
  expect(store.editorView.state.doc.textContent).toBe('')
  expect(store.files.length).toBe(1)
  await ctrl.discard()
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(0)
})

test('discard - close collab', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{text}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.startCollab()
  const tr = store.editorView.state.tr
  tr.insertText('111')
  store.editorView.dispatch(tr)
  await ctrl.discard()
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(0)
})

test('startCollab', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.startCollab()
  expect(store.editorView.state.doc.textContent).toBe('')
  expect(store.collab.started).toBe(true)
  expect(store.collab.room).not.toBe(undefined)
  expect(store.collab.provider).not.toBe(undefined)
  await ctrl.stopCollab()
})

test('clean', async () => {
  const error = {id: 'fail'}
  const [store, ctrl] = createCtrl(createState({
    error,
    files: [{text}],
  }))
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('Test')
  store.editorView.dispatch(tr)
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.error).toBe(error)
  await ctrl.clean()
  expect(store.error).toBe(undefined)
  expect(store.editorView.state.doc.textContent).toBe('')
  expect(store.files.length).toBe(0)
})

test('startCollab - with text', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editorView.state.tr
  tr.insertText('Test')
  store.editorView.dispatch(tr)
  await ctrl.startCollab()
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.collab.started).toBe(true)
  expect(store.collab.room).not.toBe(undefined)
  expect(store.collab.provider).not.toBe(undefined)
})
