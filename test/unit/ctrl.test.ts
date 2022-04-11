import {vi, expect, test} from 'vitest'
import {createCtrl} from '../../src/ctrl'
import {newState} from '../../src/state'
import {createEmptyText} from '../../src/prosemirror'

const lastModified = new Date()

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('../../src/remote', () => ({
  getFileLastModified: async () => lastModified,
  readFile: async (path: string) => {
    return path === 'file1' ? '# File1' : ''
  },
}))

vi.mock('../../src/db', () => ({
  get: async () => undefined,
  set: async () => undefined,
}))

const text = {
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text: 'Test'}]}]
  },
  selection: {
    type: 'text',
    anchor: 1,
    head: 1
  }
}

test('setState', () => {
  const [store, ctrl] = createCtrl(newState())
  ctrl.setState({fullscreen: true})
  expect(store.fullscreen).toBe(true)
})

test('newFile', async () => {
  const [store, ctrl] = createCtrl(newState())
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toEqual('')
  expect(store.files[0].text).toEqual(text)
})

test('newFile - empty', async () => {
  const [store, ctrl] = createCtrl(newState())
  const target = document.createElement('div')
  ctrl.updateEditorState(store, createEmptyText())
  ctrl.createEditorView(target)
  await ctrl.newFile()
  expect(store.files.length).toBe(0)
})

test('newFile - collab', async () => {
  const [store, ctrl] = createCtrl(newState())
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.startCollab()
  const room = store.collab.room
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toEqual('')
  expect(store.collab).toBe(undefined)
  expect(store.files[0].text).toEqual(text)
  expect(store.files[0].collab.room).toEqual(room)
})

test('openFile', async () => {
  const [store, ctrl] = createCtrl(newState())
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.openFile({text})
  expect(store.files.length).toBe(0)
  expect(store.editorView.state.toJSON()).toEqual(text)
})

test('openFile - add to files', async () => {
  const [store, ctrl] = createCtrl(newState({
    lastModified: new Date(),
  }))
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.openFile({text})
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.toJSON()).toEqual(text)
})

test('openFile - dont add if not modified', async () => {
  const [store, ctrl] = createCtrl(newState({}))
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.openFile({text})
  expect(store.files.length).toBe(0)
  expect(store.editorView.state.toJSON()).toEqual(text)
})

test('openFile - path in files', async () => {
  const [store, ctrl] = createCtrl(newState({
    files: [
      {path: 'file1', lastModified: lastModified.toISOString()},
      {path: 'file2'},
    ]
  }))

  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  expect(store.editorView.state.doc.textContent).toBe('File1')
  expect(store.path).toBe('file1')
  expect(store.lastModified).toEqual(lastModified)
})

test('openFile - push path to files', async () => {
  const [store, ctrl] = createCtrl(newState({
    lastModified,
    path: 'file2',
  }))

  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  expect(store.files[0].path).toBe('file2')
  expect(store.files[0].lastModified).toBe(lastModified.toISOString())
  expect(store.editorView.state.doc.textContent).toBe('File1')
  expect(store.path).toBe('file1')
})

test('openFile - path and text', async () => {
  const [store, ctrl] = createCtrl(newState({}))
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.openFile({text, path: 'file1'})
  expect(store.editorView.state.doc.textContent).toBe('Test')
})

test('openFile - open collab', async () => {
  const file = {text, collab: {room: 'room-123'}}
  const [store, ctrl] = createCtrl(newState({files: [file]}))
  const target = document.createElement('div')
  ctrl.updateEditorState(store, createEmptyText())
  ctrl.createEditorView(target)
  await ctrl.openFile(file)
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(0)
  expect(store.collab.room).toBe('room-123')
})

test('discard - with path', async () => {
  const [store, ctrl] = createCtrl(newState({
    files: [{path: 'file1'}],
    lastModified,
    path: 'file2',
  }))

  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.discard()
  expect(store.editorView.state.doc.textContent).toBe('File1')
  expect(store.path).toBe('file1')
  expect(store.files.length).toBe(0)
})

test('discard - open collab', async () => {
  const [store, ctrl] = createCtrl(newState({
    files: [{text, collab: {room: 'room-123'}}],
  }))

  const target = document.createElement('div')
  ctrl.updateEditorState(store, createEmptyText())
  ctrl.createEditorView(target)
  await ctrl.discard()
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.files.length).toBe(0)
  expect(store.collab.room).toBe('room-123')
})

test('startCollab', async () => {
  const [store, ctrl] = createCtrl(newState({}))
  const target = document.createElement('div')
  ctrl.updateEditorState(store, text)
  ctrl.createEditorView(target)
  await ctrl.startCollab()
  expect(store.editorView.state.doc.textContent).toBe('Test')
  expect(store.collab.started).toBe(true)
  expect(store.collab.room).not.toBe(undefined)
  expect(store.collab.y).not.toBe(undefined)
})
