import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {createState} from '@/state'
import {createIpcMock, renderEditor} from '../util/util'
import {createYUpdate, getText, insertText} from '../util/prosemirror-util'

vi.stubGlobal('__TAURI__', {})

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
    {id: '1', path: 'file1', ydoc: createYUpdate('1', ['Test']), lastModified, deleted: true},
    {id: '2', path: 'file2', ydoc: createYUpdate('2', ['Test 2']), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  expect(ctrl.file.currentFile?.id).toBe('2')
  await renderEditor('2', ctrl, target)

  await vi.waitFor(() => {
    expect(getText(ctrl)).toBe('File2')
  })

  await ctrl.editor.openFileByPath('file1')
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(ctrl.file.currentFile?.lastModified).toEqual(lastModified)
  expect(ctrl.file.currentFile?.deleted).toEqual(false)

  expect(ctrl.file.currentFile?.id).toBe('1')
  await renderEditor('1', ctrl, target)

  await vi.waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFileByPath - push path to files', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(store.files.length).toBe(1)
  insertText(ctrl, 'Test')

  await ctrl.editor.openFileByPath('file1')
  expect(store.files.length).toBe(2)
  expect(store.files[0].path).toBe(undefined)
  expect(store.files[1].path).toBe('file1')
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  await vi.waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFileByPath - path and text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(store.files.length).toBe(1)

  await ctrl.editor.openFileByPath('file1')
  expect(store.files.length).toBe(2)
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  await vi.waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFileByPath - file not found', async () => {
  createIpcMock()

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(store.files.length).toBe(1)

  clearMocks()
  createIpcMock({
    'resolve_path': () => { throw new Error('Fail') }
  })

  await ctrl.editor.openFileByPath('file1')

  expect(store.files.length).toBe(1)
  expect(store.error).toBeDefined()
})
