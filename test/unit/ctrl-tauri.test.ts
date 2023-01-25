import {vi, expect, test, beforeEach} from 'vitest'
import {clearMocks, mockIPC} from '@tauri-apps/api/mocks'

vi.stubGlobal('__TAURI__', {})
vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('idb-keyval', () => ({
  get: async () => DB.data,
  set: async () => undefined,
}))

import {createCtrl} from '@/ctrl'
import {createState} from '@/state'

const lastModified = new Date()
const DB = {data: undefined}

const createText = (text: string) => ({
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}]
  },
})

const text = createText('Test')

beforeEach(() => {
  DB.data = undefined
  clearMocks()
  mockIPC((cmd, args: any) => {
    if (cmd === 'get_args') {
      return {}
    } else if (cmd === 'resolve_path') {
      return args.paths[0]
    } else if (cmd === 'get_file_last_modified') {
      return lastModified
    } else if (args?.message?.cmd === 'readTextFile') {
      return '# File1'
    }
  })
})

test('init - saved path', async () => {
  DB.data = JSON.stringify(createState({path: 'file1'}))

  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.path).toBe('file1')
  expect(store.editorView.state.doc.textContent).toBe('File1')
})

test('init - check text', async () => {
  clearMocks()
  mockIPC((cmd, args: any) => {
    if (cmd === 'get_args') {
      return {file: 'file2'}
    } else if (cmd === 'resolve_path') {
      return args.paths[0]
    } else if (cmd === 'get_file_last_modified') {
      return lastModified
    } else if (args?.message?.cmd === 'readTextFile') {
      return '# File2'
    }
  })

  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.path).toBe('file2')
  expect(store.editorView.state.doc.textContent).toBe('File2')
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
