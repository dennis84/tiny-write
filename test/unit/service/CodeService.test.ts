import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Mode, createState} from '@/state'
import {createCtrl} from '@/services'
import {createYUpdate} from '../util/codemirror-util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => '',
  addEventListener: () => undefined
})))

beforeEach(() => {
  vi.restoreAllMocks()
})

test('newFile', async () => {
  const {store, ctrl} = createCtrl(createState())
  await ctrl.app.init()
  expect(store.mode).toBe(Mode.Editor)

  await ctrl.code.newFile()
  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(2)
  expect(store.files[1].code).toBe(true)
  expect(store.files[1].active).toBe(true)
})

test('openFile', async () => {
  const {store, ctrl} = createCtrl(createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'file1'), active: true, versions: [], code: true},
      {id: '2', ydoc: createYUpdate('1', 'file2'), versions: [], code: true},
    ],
    mode: Mode.Code,
  }))

  await ctrl.app.init()

  expect(store.mode).toBe(Mode.Code)
  expect(ctrl.file.currentFile?.id).toBe('1')

  await ctrl.code.openFile('2')
  expect(ctrl.file.currentFile?.id).toBe('2')
})

test('renderEditor - existing file', async () => {
  const {store, ctrl} = createCtrl(createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'file1'), active: true, versions: [], code: true},
    ],
    mode: Mode.Code,
  }))

  await ctrl.app.init()

  expect(store.mode).toBe(Mode.Code)
  expect(ctrl.file.currentFile?.id).toBe('1')

  const node = document.createElement('div')
  ctrl.code.renderEditor('1', node)

  expect(ctrl.file.currentFile?.codeEditorView).toBeDefined()
})

test('prettify', async () => {
  const {store, ctrl} = createCtrl(createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'const a=1;'), active: true, versions: [], code: true},
    ],
    mode: Mode.Code,
  }))

  await ctrl.app.init()

  expect(store.mode).toBe(Mode.Code)
  expect(ctrl.file.currentFile?.id).toBe('1')

  const node = document.createElement('div')
  ctrl.code.renderEditor('1', node)

  expect(ctrl.file.currentFile?.codeEditorView).toBeDefined()

  await ctrl.code.prettify()

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('const a = 1\n')
})
