import {diagnosticCount} from '@codemirror/lint'
import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {AppService} from '@/services/AppService'
import {CodeMirrorService} from '@/services/CodeMirrorService'
import {ConfigService} from '@/services/ConfigService'
import type {LocationService} from '@/services/LocationService'
import {PrettierService} from '@/services/PrettierService'
import type {ToastService} from '@/services/ToastService'
import {createState} from '@/state'
import type {State} from '@/types'

vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  vi.resetAllMocks()
})

test('createEditor', () => {
  const appService = mock<AppService>()
  const prettierService = mock<PrettierService>()
  const configService = mock<ConfigService>({
    codeTheme: ConfigService.codeThemes.dracula,
    prettier: {tabWidth: 2, useTabs: false},
  })
  const toastService = mock<ToastService>()
  const locationService = mock<LocationService>()

  const parent = document.createElement('div')
  const [store] = createStore<State>(createState())
  const service = new CodeMirrorService(
    configService,
    appService,
    prettierService,
    toastService,
    locationService,
    store,
  )
  const {editorView, compartments} = service.createEditor({id: '1', lang: 'mermaid', parent})

  expect(editorView).toBeDefined()
  expect(compartments).toBeDefined()
})

test('format', async () => {
  const [store] = createStore<State>(createState())
  const appService = mock<AppService>()
  const prettierService = new PrettierService()
  const configService = mock<ConfigService>({
    codeTheme: ConfigService.codeThemes.dracula,
    prettier: store.config.prettier,
  })
  const toastService = mock<ToastService>()
  const locationService = mock<LocationService>()

  const doc = 'const test=123'

  const parent = document.createElement('div')
  const service = new CodeMirrorService(
    configService,
    appService,
    prettierService,
    toastService,
    locationService,
    store,
  )
  const {editorView} = service.createEditor({id: '1', lang: 'typescript', parent, doc})

  await service.format(editorView, 'typescript', store.config.prettier)

  expect(editorView.state.doc.toString()).toBe('const test = 123')
})

test('format - error', async () => {
  const [store] = createStore<State>(createState())
  const appService = mock<AppService>()
  const prettierService = new PrettierService()
  const configService = mock<ConfigService>({
    codeTheme: ConfigService.codeThemes.dracula,
    prettier: store.config.prettier,
  })
  const toastService = mock<ToastService>()
  const locationService = mock<LocationService>()

  const doc = 'const test - 1'

  const parent = document.createElement('div')
  const service = new CodeMirrorService(
    configService,
    appService,
    prettierService,
    toastService,
    locationService,
    store,
  )
  const {editorView} = service.createEditor({id: '1', lang: 'typescript', parent, doc})

  expect(diagnosticCount(editorView.state)).toBe(0)

  await service.format(editorView, 'typescript', store.config.prettier)

  expect(editorView.state.doc.toString()).toBe('const test - 1')

  expect(diagnosticCount(editorView.state)).toBeGreaterThan(0)
})
