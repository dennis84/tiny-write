import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {createState} from '@/state'
import {createIpcMock, createYUpdate, getText, waitFor} from '../util'

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
  createIpcMock()
})

test('init - load existing by path', async () => {
  createIpcMock()

  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', []), path: 'file1', lastModified, active: true}
  ])

  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(ctrl.file.currentFile?.path).toBe('file1')
  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('init - check text', async () => {
  clearMocks()
  createIpcMock({
    'get_args': () => ({file: 'file2'}),
    'plugin:fs|read_text_file': () => 'File2',
  })

  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(ctrl.file.currentFile?.path).toBe('file2')
  await waitFor(() => {
    expect(getText(ctrl)).toBe('File2')
  })
})

test('init - open file', async () => {
  createIpcMock({
    'get_args': () => ({file: 'file3'}),
    'plugin:fs|read_text_file': () => 'File3',
  })

  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', path: 'file1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', path: 'file2', ydoc: createYUpdate('2', ['Test 2']), lastModified}
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.error).toBe(undefined)
  expect(store.files.length).toBe(3)
  expect(ctrl.file.currentFile?.path).toBe('file3')
})

test('init - open file path not found', async () => {
  createIpcMock({
    'get_args': () => ({newFile: 'file3'}),
    'resolve_path': () => { throw new Error('fail') },
  })

  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', path: 'file1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', path: 'file2', ydoc: createYUpdate('2', ['Test 2']), lastModified}
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.error).toBe(undefined)
  expect(store.files.length).toBe(3)
  expect(ctrl.file.currentFile?.path).toBe(undefined)
  expect(ctrl.file.currentFile?.newFile).toBe('file3')
})

test('init - persisted file path not found', async () => {
  createIpcMock({
    'resolve_path': () => { throw new Error('fail') },
  })

  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', path: 'file1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
    {id: '2', path: 'file2', ydoc: createYUpdate('2', ['Test 2']), lastModified}
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  expect(store.error).toBe(undefined)
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.id).toBe('1')
  expect(ctrl.file.currentFile?.path).toBe(undefined)
  expect(ctrl.file.currentFile?.newFile).toBe('file1')
})

test('init - dir', async () => {
  createIpcMock({
    'get_args': () => undefined
  })

  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState({args: {dir: ['~/Desktop/Aaaa.md']}}))
  await ctrl.app.init()

  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(store.args?.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('init - empty dir', async () => {
  createIpcMock({
    'get_args': () => undefined
  })

  vi.mocked(DB.getFiles).mockResolvedValue([
    {id: '1', ydoc: createYUpdate('1', ['Test']), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState({args: {dir: []}}))
  await ctrl.app.init()

  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.id).toBe('1')
  expect(store.args?.dir).toEqual(undefined)
})

test('init - dir no current file', async () => {
  createIpcMock({
    'get_args': () => undefined
  })

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
