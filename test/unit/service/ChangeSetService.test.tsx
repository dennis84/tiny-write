import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {createState} from '@/state'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {stubLocation} from '../util/util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('addVersion', async () => {
  stubLocation('/editor/1')

  const initial = createState()
  const {store, changeSetService, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await userEvent.keyboard('Test')

  expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  expect(fileService.currentFile?.versions.length).toBe(0)

  await changeSetService.addVersion()
  expect(fileService.currentFile?.versions.length).toBe(1)

  await userEvent.keyboard('123')
  expect(getByTestId('editor_scroll')).toHaveTextContent('Test123')

  changeSetService.renderVersion(fileService.currentFile!.versions[0]!)
  await vi.waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  })

  changeSetService.applyVersion(fileService.currentFile!.versions[0]!)
  await vi.waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  })
})
