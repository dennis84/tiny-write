import {vi, expect, test} from 'vitest'

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.stubGlobal('location', vi.fn(() => ({
  pathname: ''
})))

vi.mock('mermaid', () => ({}))

vi.mock('@/db', () => ({
  getEditor: vi.fn(),
  setEditor: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getWindow: vi.fn(),
  setWindow: vi.fn(),
  getFiles: vi.fn(),
  deleteFile: vi.fn(),
  updateFile: vi.fn(),
}))

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn(() => ({
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

import {createCtrl} from '@/ctrl'
import {createState} from '@/state'

const createText = (text: string) => ({
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}]
  },
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

test('init - new file if no id', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [
      {id: '1', text},
      {id: '2', text: createText('Test 2')},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(3)
  expect(store.editor.editorView.state.doc.textContent).toBe('')
})

test('init - existing file', async () => {
  const [store, ctrl] = createCtrl(createState({
    editor: {id: '2'},
    files: [
      {id: '1', text},
      {id: '2', text: createText('Test 2')},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  expect(store.editor.editorView.state.doc.textContent).toBe('Test 2')
})

test('init - join', async () => {
  const [store, ctrl] = createCtrl(createState({
    args: {room: '3'},
    editor: {id: '1'},
    files: [
      {id: '1', text},
      {id: '2', text: createText('Test 2')},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(3)
  expect(store.editor.id).toBe('3')
  expect(store.editor.editorView.state.doc.textContent).toBe('')
})

test('init - dir', async () => {
  const [store, ctrl] = createCtrl(createState({
    args: {dir: ['~/Desktop/Aaaa.md']},
    editor: {id: '1'},
    files: [{id: '1', text}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(1)
  expect(store.editor.id).toBe('1')
  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.args.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('init - dir no current file', async () => {
  const [store, ctrl] = createCtrl(createState({
    args: {dir: ['~/Desktop/Aaaa.md']},
    files: []
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(0)
  expect(store.editor.id).toBe(undefined)
  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.args.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('newFile', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editor.editorView.state.tr
  tr.insertText('Test')
  store.editor.editorView.dispatch(tr)
  expect(store.editor.editorView.state.doc.textContent).toEqual('Test')
  await ctrl.newFile()
  expect(store.editor.editorView.state.doc.textContent).toEqual('')
  expect(store.files.length).toBe(2)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files[1].ydoc).not.toBe(undefined)
})

test('newFile - empty', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
})

test('newFile - collab', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editor.editorView.state.tr
  tr.insertText('Test')
  store.editor.editorView.dispatch(tr)
  await ctrl.startCollab()
  const id = store.editor.id
  await ctrl.newFile()
  expect(store.files.length).toBe(2)
  expect(store.editor.editorView.state.doc.textContent).toEqual('')
  expect(store.editor.id).not.toEqual(id)
  expect(store.collab.started).toBe(false)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files.find((f) => f.id === id)).not.toBeNull()
})

test('openFile - existing', async () => {
  const [store, ctrl] = createCtrl(createState({
    editor: {id: '1'},
    files: [
      {id: '1', text},
      {id: '2', text: createText('Test 2')},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.editor.editorView.state.doc.textContent).toBe('Test 2')
})

test('openFile - not found', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const id = store.editor.id
  expect(store.files.length).toBe(1)
  await ctrl.openFile({id: '123', text})
  expect(store.files.length).toBe(1)
  expect(store.editor.id).toBe(id)
})

test('openFile - delete empty', async () => {
  const [store, ctrl] = createCtrl(createState({
    editor: {id: '1'},
    files: [
      {id: '1', text: {doc: {type: 'doc', content: []}}},
      {id: '2', text: createText('Test 2')},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({id: '2'})
  expect(store.files.length).toBe(1)
  expect(store.editor.editorView.state.doc.textContent).toBe('Test 2')
})

test('openFile - open collab', async () => {
  const file = {text, id: 'room-123'}
  const [store, ctrl] = createCtrl(createState({files: [file]}))
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile(file)
  expect(store.editor.editorView.state.doc.textContent).toBe('Test')
  expect(store.editor.id).toBe('room-123')
  expect(store.files.length).toBe(1)
})

test('openFile - open from collab', async () => {
  const [store, ctrl] = createCtrl(createState({
    editor: {id: '1'},
    files: [
      {id: '1', text},
      {id: '2', text: createText('Test2')},
    ],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  ctrl.startCollab()
  expect(store.files.length).toBe(2)
  expect(store.collab.started).toBe(true)
  await ctrl.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.collab.started).toBe(false)
  expect(store.editor.editorView.state.doc.textContent).toBe('Test2')
})

test('discard - open collab', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{text, id: 'room-123'}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  await ctrl.discard()

  expect(store.editor.editorView.state.doc.textContent).toBe('Test')
  expect(store.editor.id).toBe('room-123')
  expect(store.files.length).toBe(1)
})

test('discard - with text', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{id: '1', text}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editor.editorView.state.tr
  tr.insertText('111')
  store.editor.editorView.dispatch(tr)
  expect(store.files.length).toBe(2)
  await ctrl.discard()
  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.files.length).toBe(2)
  await ctrl.discard()
  expect(store.editor.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(1)
})

test('discard - close collab', async () => {
  const [store, ctrl] = createCtrl(createState({
    files: [{id: '1', text}],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  await ctrl.startCollab()
  expect(store.files.length).toBe(2)
  const tr = store.editor.editorView.state.tr
  tr.insertText('111')
  store.editor.editorView.dispatch(tr)
  await ctrl.discard()
  expect(store.editor.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(1)
})

test('clean', async () => {
  const error = {id: 'fail'}
  const [store, ctrl] = createCtrl(createState({
    files: [{id: '1', text}],
  }))
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editor.editorView.state.tr
  tr.insertText('Test')
  store.editor.editorView.dispatch(tr)
  expect(store.editor.editorView.state.doc.textContent).toBe('Test')

  ctrl.setState('error', error)
  expect(store.error).toBe(error)

  await ctrl.clean()
  expect(store.error).toBe(undefined)
  expect(store.editor.id).not.toBe('1')
  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.files.length).toBe(1)
})

test('startCollab - from empty state', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.startCollab()
  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.editor.id).not.toBe(undefined)
  expect(store.collab.started).toBe(true)
  expect(store.collab.provider).not.toBe(undefined)
  await ctrl.stopCollab()
})

test('startCollab - with text', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const tr = store.editor.editorView.state.tr
  tr.insertText('Test')
  store.editor.editorView.dispatch(tr)
  await ctrl.startCollab()
  expect(store.editor.editorView.state.doc.textContent).toBe('Test')
  expect(store.editor.id).not.toBe(undefined)
  expect(store.collab.started).toBe(true)
  expect(store.collab.provider).not.toBe(undefined)
})

test('startCollab - join new file', async () => {
  const [store, ctrl] = createCtrl(createState({
    args: {room: '2'},
    editor: {id: '1'},
    files: [{id: '1', text}],
  }))
  const target = document.createElement('div')
  await ctrl.init(target)

  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.editor.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab.started).toBe(true)
  expect(store.collab.provider).not.toBe(undefined)
})

test('startCollab - join existing file', async () => {
  const [store, ctrl] = createCtrl(createState({
    args: {room: '2'},
    editor: {id: '1'},
    files: [
      {id: '1', text},
      {id: '2', text: createText('Test2')},
    ],
  }))
  const target = document.createElement('div')
  await ctrl.init(target)

  // Not sure if updateText should be called.
  expect(store.editor.editorView.state.doc.textContent).toBe('')
  expect(store.editor.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab.started).toBe(true)
  expect(store.collab.provider).not.toBe(undefined)
})
