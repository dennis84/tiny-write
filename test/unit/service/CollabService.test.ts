import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Mode, createState} from '@/state'
import {createCtrl} from '@/services'
import * as pmUtil from '../util/prosemirror-util'
import * as cmUtil from '../util/codemirror-util'
import {renderCodeEditor, renderEditor} from '../util/util'

vi.mock('@/db', () => ({DB: mock()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('undoManager - text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  expect(store.files.length).toBe(1)
  expect(pmUtil.getText(ctrl)).toBe('')

  pmUtil.insertText(ctrl, 'Test')

  ctrl.collab.undoManager?.stopCapturing()

  pmUtil.insertText(ctrl, '123')

  expect(pmUtil.getText(ctrl)).toBe('Test123')

  ctrl.collab.undoManager?.undo()

  expect(pmUtil.getText(ctrl)).toBe('Test')
})

test('undoManager - code', async () => {
  const {ctrl, store} = createCtrl(createState({
    files: [
      {id: '1', ydoc: cmUtil.createYUpdate('1', ''), active: true, versions: [], code: true},
    ],
    mode: Mode.Code,
  }))

  const target = document.createElement('div')
  await ctrl.app.init()

  await renderCodeEditor('1', ctrl, target)
  expect(store.files.length).toBe(1)

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('')

  ctrl.file.currentFile?.codeEditorView?.dispatch({changes: {from: 0, insert: 'Test'}})
  ctrl.collab.undoManager?.stopCapturing()

  ctrl.file.currentFile?.codeEditorView?.dispatch({changes: {from: 4, insert: '123'}})

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test123')

  ctrl.collab.undoManager?.undo()

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test')
})
