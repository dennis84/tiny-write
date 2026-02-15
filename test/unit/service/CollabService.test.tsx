import {waitFor} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createState} from '@/state'
import * as cmUtil from '../testutil/codemirror-util'
import * as pmUtil from '../testutil/prosemirror-util'
import {renderMain, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({DB: mock()}))

class WebSocketMock {
  close() {}
}

vi.stubGlobal('WebSocket', WebSocketMock)

beforeEach(() => {
  vi.resetAllMocks()
})

test('undoManager - text', async () => {
  stubLocation('/editor/1')

  const initial = createState({
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.store.files.length).toBe(1)
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')

  await userEvent.keyboard('Test', {delay: 10})

  ctrl.collabService.undoManager?.stopCapturing()

  await userEvent.keyboard('123', {delay: 10})

  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test123$/)

  ctrl.collabService.undoManager?.undo()

  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)
})

test('undoManager - code', async () => {
  stubLocation('/code/1')

  const initial = createState({
    files: [{id: '1', ydoc: cmUtil.createYUpdate('1', ''), versions: [], code: true}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.store.files.length).toBe(1)
  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('')

  await userEvent.keyboard('Test', {delay: 10})

  ctrl.collabService.undoManager?.stopCapturing()

  await userEvent.keyboard('123', {delay: 10})

  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test123')

  ctrl.collabService.undoManager?.undo()

  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test')
})

test('startCollab', async () => {
  stubLocation('/editor/1')

  const initial = createState({
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await userEvent.keyboard('Test', {delay: 10})
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  ctrl.collabService.connect()

  expect(ctrl.collabService.started()).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  ctrl.collabService.disconnect()

  expect(ctrl.collabService.started()).toBe(false)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  ctrl.collabService.connect()

  expect(ctrl.collabService.started()).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)
})
