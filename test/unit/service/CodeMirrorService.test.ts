import {vi, test, beforeEach, expect} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {State, createState} from '@/state'
import {CodeMirrorService} from '@/services/CodeMirrorService'
import {ConfigService} from '@/services/ConfigService'
import {AppService} from '@/services/AppService'

vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  vi.resetAllMocks()
})

test('createEditor', () => {
  const appService = mock<AppService>()
  const configService = mock<ConfigService>({
    codeTheme: ConfigService.codeThemes.dracula,
    prettier: {tabWidth: 2, useTabs: false},
  })

  const parent = document.createElement('div')
  const [store] = createStore<State>(createState())
  const service = new CodeMirrorService(configService, appService, store)
  const {editorView, compartments} = service.createEditor({lang: 'mermaid', parent})

  expect(editorView).toBeDefined()
  expect(compartments).toBeDefined()
})
