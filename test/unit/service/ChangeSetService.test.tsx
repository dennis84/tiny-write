import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {createState} from '@/state'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('addVersion', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const initial = createState()
  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await userEvent.keyboard('Test')

  expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  expect(ctrl.file.currentFile?.versions.length).toBe(0)

  await ctrl.changeSet.addVersion()
  expect(ctrl.file.currentFile?.versions.length).toBe(1)

  await userEvent.keyboard('123')
  expect(getByTestId('editor_scroll')).toHaveTextContent('Test123')

  ctrl.changeSet.renderVersion(ctrl.file.currentFile!.versions[0]!)
  await vi.waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  })

  ctrl.changeSet.applyVersion(ctrl.file.currentFile!.versions[0]!)
  await vi.waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  })
})
