import {waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {createState} from '@/state'
import {Page} from '@/types'
import {createYUpdate} from '../testutil/codemirror-util'
import {expectToBeDefined, renderMain, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({
  DB: mock({
    getFiles: vi.fn(),
  }),
}))

vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.resetAllMocks()
})

const lastModified = new Date()

test('prettify', async () => {
  stubLocation('/code/1')

  vi.spyOn(DB, 'getFiles').mockResolvedValue([
    {
      id: '1',
      ydoc: createYUpdate('1', 'const a=1;'),
      versions: [],
      code: true,
      codeLang: 'typescript',
      lastModified,
    },
  ])

  const state = createState()
  const {getByTestId, ctrl} = renderMain(state)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.locationService?.page).toBe(Page.Code)
  expect(ctrl.fileService.currentFile?.id).toBe('1')
  expect(ctrl.fileService.currentFile?.codeEditorView).toBeDefined()
  expectToBeDefined(ctrl.fileService.currentFile)

  await ctrl.codeService.prettify(ctrl.fileService.currentFile)

  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('const a = 1')
})
