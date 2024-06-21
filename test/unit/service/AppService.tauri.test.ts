import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {ElementType, Mode, createState} from '@/state'
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
  expect(ctrl.file.currentFile?.id).toBe('1')
  ctrl.editor.renderEditor('1', target)

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
  ctrl.editor.renderEditor(ctrl.file.currentFile!.id, target)

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

  expect(store.files.length).toBe(3)
  expect(ctrl.file.currentFile?.id).not.toBe('1')
  ctrl.editor.renderEditor(ctrl.file.currentFile!.id, target)

  expect(store.error).toBe(undefined)
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
  expect(ctrl.file.currentFile?.id).not.toBe('1')
  expect(store.files.length).toBe(3)

  ctrl.editor.renderEditor(ctrl.file.currentFile!.id, target)

  expect(store.error).toBe(undefined)
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
  expect(ctrl.file.currentFile?.id).toBe('1')
  ctrl.editor.renderEditor('1', target)

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

  await ctrl.app.init()
  expect(ctrl.file.currentFile?.id).toBeUndefined()

  expect(store.files.length).toBe(0)
  expect(ctrl.file.currentFile).toBe(undefined)
  expect(store.args?.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test.each([
  {fileActive: true, expected: '/users/me/project', cwd: '/users/me/cwd'},
  {fileActive: false, expected: undefined},
  {fileActive: false, cwd: '/users/me/cwd', expected: '/users/me/cwd'},
  {fileActive: true, mode: Mode.Canvas, expected: '/users/me/project'},
  {fileActive: false, mode: Mode.Canvas, expected: undefined},
])('getBasePath - from file', async (data) => {
  const canvasEditor = {
    id: '1',
    type: ElementType.Editor,
    active: data.fileActive && data.mode === Mode.Canvas,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const state = createState({
    args: {cwd: data.cwd},
    mode: data.mode ?? Mode.Editor,
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Test']),
        lastModified,
        active: data.fileActive ?? false,
        versions: [],
        path: '/users/me/project/file1',
      }
    ],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        active: true,
        elements: [canvasEditor]
      }
    ]
  })

  const {ctrl} = createCtrl(state)
  const basePath = await ctrl.app.getBasePath()
  expect(basePath).toBe(data.expected)
})
