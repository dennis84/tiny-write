import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'

vi.mock('@/db', () => ({DB: mock()}))

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

import {createStore} from 'solid-js/store'
import {createState} from '@/state'
import {Ctrl} from '@/services'
import {ConfigService} from '@/services/ConfigService'

beforeEach(() => {
  vi.restoreAllMocks()
})

const ctrl = mockDeep<Ctrl>()

test('getters', () => {
  const prettier = {
    printWidth: 80,
    tabWidth: 2,
    useTabs: true,
    semi: true,
    singleQuote: true,
  }

  const [store, setState] = createStore(createState({
    config: {
      font: 'ia-writer-mono',
      codeTheme: 'dracula',
      fontSize: 12,
      contentWidth: 200,
      alwaysOnTop: true,
      typewriterMode: true,
      spellcheck: true,
      prettier,
    }
  }))

  const service = new ConfigService(ctrl, store, setState)
  expect(service.fontSize).toBe(12)
  expect(service.typewriterMode).toBe(true)
  expect(service.prettier).toEqual(prettier)
  expect(service.codeTheme.value).toBe('dracula')
  expect(service.font.value).toBe('ia-writer-mono')
  expect(service.fontFamily).toBe('ia-writer-mono')
  expect(service.theme.value).toBe('light')
})

test('updateConfig', async () => {
  const [store, setState] = createStore(createState())
  const service = new ConfigService(ctrl, store, setState)

  await service.updateConfig({
    fontSize: 10,
    font: 'merriweather',
    contentWidth: 100,
  })

  expect(service.fontSize).toBe(10)
  expect(service.font.value).toBe('merriweather')
  expect(store.config.contentWidth).toBe(100)

  expect(ctrl.collab.setConfig).toBeCalledWith({
    fontSize: 10,
    font: 'merriweather',
    contentWidth: 100,
  })
})
