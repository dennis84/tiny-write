import {vi, expect, test, beforeEach} from 'vitest'
import {clearMocks, mockIPC} from '@tauri-apps/api/mocks'
import * as db from '@/db'

vi.stubGlobal('__TAURI__', {})
vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
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

import {createCtrl} from '@/ctrl'
import {createState} from '@/state'

const lastModified = new Date()

const createText = (text: string) => ({
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}]
  },
})

const text = createText('Test')

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
  mockIPC((cmd, args: any) => {
    if (cmd === 'get_args') {
      return {}
    } else if (cmd === 'resolve_path') {
      return args.paths[0]
    } else if (cmd === 'get_file_last_modified') {
      return lastModified
    } else if (args?.message?.cmd === 'readTextFile') {
      return args.message.path === 'file1' ? '# File1' : '# File2'
    }
  })
})

test('init - load existing by path', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([{id: '1', ydoc: '', path: 'file1', lastModified}])
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})

  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.editor.path).toBe('file1')
  expect(store.editor.editorView.state.doc.textContent).toBe('File1')
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
  expect(store.editor.path).toBe('file2')
  expect(store.editor.editorView.state.doc.textContent).toBe('File2')
})

test('openFile - path in files', async () => {
  const [store, ctrl] = createCtrl(createState({
    editor: {id: '2'},
    files: [
      {id: '1', path: 'file1', lastModified},
      {id: '2', path: 'file2'},
    ]
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(2)
  expect(store.editor.editorView.state.doc.textContent).toBe('File1')
  expect(store.editor.path).toBe('file1')
  expect(store.editor.lastModified).toEqual(lastModified)
})

test('openFile - push path to files', async () => {
  const [store, ctrl] = createCtrl(createState({}))
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(1)
  const tr = store.editor.editorView.state.tr
  tr.insertText('Test')
  store.editor.editorView.dispatch(tr)
  await ctrl.openFile({path: 'file1'})
  expect(store.files.length).toBe(2)
  expect(store.files[0].path).toBe(undefined)
  expect(store.files[1].path).toBe('file1')
  expect(store.editor.editorView.state.doc.textContent).toBe('File1')
  expect(store.editor.path).toBe('file1')
})

test('openFile - path and text', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({text, path: 'file1'})
  expect(store.editor.editorView.state.doc.textContent).toBe('File1')
})

test('discard - with path', async () => {
  const [store, ctrl] = createCtrl(createState({
    editor: {id: '1'},
    files: [
      {id: '1', path: 'file1'},
      {id: '2', path: 'file2'},
    ],
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  await ctrl.discard()
  expect(store.files.length).toBe(1)
  expect(store.editor.editorView.state.doc.textContent).toBe('File2')
  expect(store.editor.path).toBe('file2')
  expect(store.editor.id).toBe('2')
})
