import {waitFor} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createState} from '@/state'
import {createYUpdate} from '../testutil/prosemirror-util'
import {expectToBeDefined, renderMain, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.resetAllMocks()
})

test('addVersion', async () => {
  stubLocation('/editor/1')

  const initial = createState({
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await userEvent.keyboard('Test', {delay: 10})

  expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  expect(ctrl.fileService.currentFile?.versions.length).toBe(0)

  await ctrl.changeSetService.addVersion()
  expect(ctrl.fileService.currentFile?.versions.length).toBe(1)

  await userEvent.keyboard('123', {delay: 10})
  expect(getByTestId('editor_scroll')).toHaveTextContent('Test123')

  expectToBeDefined(ctrl.fileService.currentFile?.versions[0])
  ctrl.changeSetService.applyVersion(ctrl.fileService.currentFile?.versions[0])
  await vi.waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent('Test')
  })
})

test('render snapshot', async () => {
  stubLocation('/editor/1', {snapshot: 1})

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Test']),
        versions: [
          {date: new Date(), ydoc: createYUpdate('1', ['A'])},
          {date: new Date(), ydoc: createYUpdate('1', ['B'])},
        ],
      },
    ],
  })
  const {getByTestId} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toHaveTextContent('B')
  })
})
