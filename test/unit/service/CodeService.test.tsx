import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {Mode, createState} from '@/state'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {createYUpdate} from '../util/codemirror-util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
})

test('prettify', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/code/1'))

  const {store, codeService, fileService} = createCtrl(
    createState({
      files: [
        {
          id: '1',
          ydoc: createYUpdate('1', 'const a=1;'),
          active: true,
          versions: [],
          code: true,
          codeLang: 'typescript',
        },
      ],
      mode: Mode.Code,
    }),
  )

  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Code)
  expect(fileService.currentFile?.id).toBe('1')
  expect(fileService.currentFile?.codeEditorView).toBeDefined()

  await codeService.prettify(fileService.currentFile!)

  expect(fileService.currentFile?.codeEditorView?.state.doc.toString()).toBe('const a = 1')
})
