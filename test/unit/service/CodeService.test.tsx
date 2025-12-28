import {render, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Main} from '@/components/Main'
import {createCtrl} from '@/services'
import {createState} from '@/state'
import {Page} from '@/types'
import {createYUpdate} from '../testutil/codemirror-util'
import {expectToBeDefined, stubLocation} from '../testutil/util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.resetAllMocks()
})

test('prettify', async () => {
  stubLocation('/code/1')

  const ctrl = createCtrl(
    createState({
      files: [
        {
          id: '1',
          ydoc: createYUpdate('1', 'const a=1;'),
          versions: [],
          code: true,
          codeLang: 'typescript',
        },
      ],
    }),
  )

  const {getByTestId} = render(() => <Main state={ctrl} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.store.location?.page).toBe(Page.Code)
  expect(ctrl.fileService.currentFile?.id).toBe('1')
  expect(ctrl.fileService.currentFile?.codeEditorView).toBeDefined()
  expectToBeDefined(ctrl.fileService.currentFile)

  await ctrl.codeService.prettify(ctrl.fileService.currentFile)

  expect(ctrl.fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('const a = 1')
})
