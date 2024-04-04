import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {createState} from '@/state'
import {createIpcMock, createYUpdate, getText, insertText, waitFor} from '../util'

vi.stubGlobal('__TAURI__', {})
vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({DB: mock<DB>()}))

const lastModified = new Date()

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
  createIpcMock({
    'plugin:fs|read_text_file': (path) => path === 'file1' ? '# File1' : '# File2'
  })
})

test('openFileByPath - path in files', async () => {
  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', path: 'file1', ydoc: createYUpdate('1', ['Test']), lastModified},
    {id: '2', path: 'file2', ydoc: createYUpdate('2', ['Test 2']), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File2')
  })

  await ctrl.editor.openFileByPath('file1')
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(ctrl.file.currentFile?.lastModified).toEqual(lastModified)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFileByPath - push path to files', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(1)
  insertText(ctrl, 'Test')

  await ctrl.editor.openFileByPath('file1')
  expect(store.files.length).toBe(2)
  expect(store.files[0].path).toBe(undefined)
  expect(store.files[1].path).toBe('file1')
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFileByPath - path and text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.files.length).toBe(1)

  await ctrl.editor.openFileByPath('file1')
  expect(store.files.length).toBe(2)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})
