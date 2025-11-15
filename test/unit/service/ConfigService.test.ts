import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'

vi.mock('@/db', () => ({DB: mock()}))

import {createStore} from 'solid-js/store'
import type {CollabService} from '@/services/CollabService'
import {ConfigService} from '@/services/ConfigService'
import {createState} from '@/state'

beforeEach(() => {
  vi.resetAllMocks()
})

const collabService = mock<CollabService>()

test('getters', () => {
  const prettier = {
    printWidth: 80,
    tabWidth: 2,
    useTabs: true,
    semi: true,
    singleQuote: true,
    bracketSpacing: false,
  }

  const [store, setState] = createStore(
    createState({
      config: {
        font: 'ia-writer-mono',
        theme: {code: 'dracula'},
        fontSize: 12,
        contentWidth: 200,
        alwaysOnTop: true,
        typewriterMode: true,
        spellcheck: true,
        prettier,
      },
    }),
  )

  const service = new ConfigService(collabService, store, setState)
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
  const service = new ConfigService(collabService, store, setState)

  await service.updateConfig({
    fontSize: 10,
    font: 'merriweather',
    contentWidth: 100,
  })

  expect(service.fontSize).toBe(10)
  expect(service.font.value).toBe('merriweather')
  expect(store.config.contentWidth).toBe(100)

  expect(collabService.setConfig).toBeCalledWith({
    fontSize: 10,
    font: 'merriweather',
    contentWidth: 100,
  })
})

test('toggleDarkMode', async () => {
  const [store, setState] = createStore(createState())
  const service = new ConfigService(collabService, store, setState)

  expect(service.theme.value).toEqual('light')
  expect(service.codeTheme.value).toEqual('tokyo-night-day')

  await service.toggleDarkMode()

  expect(store.config.theme.main).toEqual('dark')
  expect(store.config.theme.code).toEqual('tokyo-night')
  expect(store.config.theme.mainDark).toEqual('dark')
  expect(store.config.theme.mainLight).toEqual(undefined)
  expect(store.config.theme.codeDark).toEqual('tokyo-night')
  expect(store.config.theme.codeLight).toEqual(undefined)

  await service.updateTheme({main: 'solarized-light', code: 'solarized-light'})

  expect(store.config.theme.main).toEqual('solarized-light')
  expect(store.config.theme.code).toEqual('solarized-light')
  expect(store.config.theme.mainDark).toEqual('dark')
  expect(store.config.theme.mainLight).toEqual('solarized-light')
  expect(store.config.theme.codeDark).toEqual('tokyo-night')
  expect(store.config.theme.codeLight).toEqual('solarized-light')

  await service.toggleDarkMode()

  expect(store.config.theme.main).toEqual('dark')
  expect(store.config.theme.code).toEqual('tokyo-night')
  expect(store.config.theme.mainDark).toEqual('dark')
  expect(store.config.theme.mainLight).toEqual('solarized-light')
  expect(store.config.theme.codeDark).toEqual('tokyo-night')
  expect(store.config.theme.codeLight).toEqual('solarized-light')
})
