import {vi, expect, test} from 'vitest'
import {EditorState} from 'prosemirror-state'
import {schema} from 'prosemirror-markdown'
import {createCtrl} from '../../src/ctrl'
import {newState} from '../../src/state'

const lastModified = new Date()

vi.mock('../../src/remote', () => ({
  getFileLastModified: async () => lastModified,
  readFile: async (path: string) => {
    return path === 'file1' ? '# File1' : ''
  },
}))

vi.mock('../../src/db', () => {
  return {
    get: () => '',
    set: () => undefined,
  }
})

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

const editorState = EditorState.fromJSON({schema}, text)

test('setState', () => {
  const [store, ctrl] = createCtrl(newState())
  ctrl.setState({fullscreen: true})
  expect(store.fullscreen).toBe(true)
})

test('openFile', async () => {
  const [store, ctrl] = createCtrl(newState())
  await ctrl.openFile({text})
  expect(store.files.length).toBe(0)
  expect(store.text !== undefined).toBe(true)
  expect(store.extensions !== undefined).toBe(true)
})

test('openFile - add to files', async () => {
  const [store, ctrl] = createCtrl(newState({
    text: editorState,
    lastModified: new Date(),
  }))
  await ctrl.openFile({text})
  expect(store.files.length).toBe(1)
  expect(store.text).toEqual(text)
  expect(store.extensions !== undefined).toBe(true)
})

test('openFile - dont add if not modified', async () => {
  const [store, ctrl] = createCtrl(newState({
    text: editorState,
  }))
  await ctrl.openFile({text})
  expect(store.files.length).toBe(0)
  expect(store.text).toEqual(text)
  expect(store.extensions !== undefined).toBe(true)
})

test('openFile - path in files', async () => {
  const [store, ctrl] = createCtrl(newState({
    files: [
      {path: 'file1', lastModified: lastModified.toISOString()},
      {path: 'file2'},
    ]
  }))

  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  expect(store.text !== undefined).toBe(true)
  expect(store.extensions !== undefined).toBe(true)
  expect(store.path).toBe('file1')
  expect(store.lastModified).toEqual(lastModified)
})

test('openFile - push path to files', async () => {
  const [store, ctrl] = createCtrl(newState({
    text: editorState,
    lastModified,
    path: 'file2',
  }))

  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  expect(store.files[0].path).toBe('file2')
  expect(store.files[0].lastModified).toBe(lastModified.toISOString())
  expect(store.text !== undefined).toBe(true)
  expect(store.extensions !== undefined).toBe(true)
  expect(store.path).toBe('file1')
})
