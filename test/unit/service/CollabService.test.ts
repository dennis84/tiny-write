import {expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {Mode, createState} from '@/state'
import {Ctrl, createCtrl} from '@/services'
import {CollabService} from '@/services/CollabService'
import * as pmUtil from '../util/prosemirror-util'
import * as cmUtil from '../util/codemirror-util'

vi.mock('@/db', () => ({DB: mock()}))

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => '',
  addEventListener: () => undefined,
})))

const ctrl = mockDeep<Ctrl>()

const WsMock = vi.fn()

vi.stubGlobal('WebSocket', WsMock)

test('init', () => {
  const collab = CollabService.create('123', Mode.Editor, true)

  // connection will be established directly
  expect(WsMock).toBeCalled()

  const [store, setState] = createStore(createState({collab}))

  const service = new CollabService(ctrl, store, setState)
  const file = {id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}

  // register events
  service.init(file)
  collab.ydoc.getMap('config').set('font', 'test')
  expect(store.config.font).toBe('test')

  // create new collab (open another file)

  // no sync without init
  const newCollab = CollabService.create('1234', Mode.Editor, true)
  setState('collab', newCollab)
  collab.ydoc.getMap('config').set('font', 'test123')
  expect(store.config.font).toBe('test')

  // after init
  service.init(file)
  collab.ydoc.getMap('config').set('font', 'test123')
  expect(store.config.font).toBe('test123')
})

test('undoManager - text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()

  const currentFileId = ctrl.file.currentFile?.id
  ctrl.editor.renderEditor(currentFileId!, target)

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

  const currentFileId = ctrl.file.currentFile?.id
  ctrl.code.renderEditor(currentFileId!, target)
  expect(store.files.length).toBe(1)

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('')

  ctrl.file.currentFile?.codeEditorView?.dispatch({changes: {from: 0, insert: 'Test'}})
  ctrl.collab.undoManager?.stopCapturing()

  ctrl.file.currentFile?.codeEditorView?.dispatch({changes: {from: 4, insert: '123'}})

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test123')

  ctrl.collab.undoManager?.undo()

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test')
})
