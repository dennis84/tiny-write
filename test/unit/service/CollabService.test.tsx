import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import userEvent from '@testing-library/user-event'
import {render, waitFor} from '@solidjs/testing-library'
import {createState} from '@/state'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {stubLocation} from '../util/util'

vi.mock('@/db', () => ({DB: mock()}))

const WsMock = vi.fn(() => ({
  close: vi.fn(),
}))

vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('undoManager - text', async () => {
  stubLocation('/editor/1')

  const {store, collabService} = createCtrl(createState())
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.files.length).toBe(1)
  expect(getByTestId('editor_scroll')).toHaveTextContent('Start typing ...')

  await userEvent.keyboard('Test')

  collabService.undoManager?.stopCapturing()

  await userEvent.keyboard('123')

  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test123$/)

  collabService.undoManager?.undo()

  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)
})

test('undoManager - code', async () => {
  stubLocation('/code/1')

  const {store, collabService, fileService} = createCtrl(createState())
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.files.length).toBe(1)
  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('')

  await userEvent.keyboard('Test')

  collabService.undoManager?.stopCapturing()

  await userEvent.keyboard('123')

  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test123')

  collabService.undoManager?.undo()

  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('Test')
})

test('startCollab', async () => {
  stubLocation('/editor/1')

  const {store, collabService} = createCtrl(createState())
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await userEvent.keyboard('Test')
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  collabService.startCollab()

  expect(store.collab?.started).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  collabService.stopCollab()

  expect(store.collab?.started).toBe(false)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)

  collabService.startCollab()

  expect(store.collab?.started).toBe(true)
  expect(getByTestId('editor_scroll')).toHaveTextContent(/^Test$/)
})
