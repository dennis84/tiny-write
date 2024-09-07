import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import userEvent from '@testing-library/user-event'
import {render, waitFor} from '@solidjs/testing-library'
import {createState} from '@/state'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'

vi.mock('@/db', () => ({DB: mock()}))

const WsMock = vi.fn(() => ({
  close: vi.fn(),
}))

vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('undoManager - text', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const {ctrl, store} = createCtrl(createState())
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.files.length).toBe(1)
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')

  await userEvent.keyboard('Test')

  ctrl.collab.undoManager?.stopCapturing()

  await userEvent.keyboard('123')

  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test123$/)

  ctrl.collab.undoManager?.undo()

  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)
})

test('undoManager - code', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/code/1'))

  const {ctrl, store} = createCtrl(createState())
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('')

  await userEvent.keyboard('Test')

  ctrl.collab.undoManager?.stopCapturing()

  await userEvent.keyboard('123')

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test123')

  ctrl.collab.undoManager?.undo()

  expect(ctrl.file.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test')
})

test('startCollab', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const {ctrl, store} = createCtrl(createState())
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await userEvent.keyboard('Test')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  ctrl.collab.startCollab()

  expect(store.collab?.started).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  ctrl.collab.stopCollab()

  expect(store.collab?.started).toBe(false)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  ctrl.collab.startCollab()

  expect(store.collab?.started).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)
})
