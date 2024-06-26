import {vi, test, beforeEach, expect} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {State, createState} from '@/state'
import {Ctrl} from '@/services'
import {CodeMirrorService} from '@/services/CodeMirrorService'
import {ConfigService} from '@/services/ConfigService'

vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  vi.resetAllMocks()
})

test('createEditor', () => {
  const ctrl = mockDeep<Ctrl>({
    config: mockDeep<ConfigService>({
      codeTheme: ConfigService.codeThemes.dracula
    })
  })

  const [store] = createStore<State>(createState())
  const service = new CodeMirrorService(ctrl, store)
  const {editorView, compartments} = service.createEditor({lang: 'mermaid'})

  expect(editorView).toBeDefined()
  expect(compartments).toBeDefined()
})
