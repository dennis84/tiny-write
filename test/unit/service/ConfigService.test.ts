import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'

vi.mock('@/db', () => ({DB: mock()}))

import {createStore} from 'solid-js/store'
import {createState} from '@/state'
import {ConfigService} from '@/services/ConfigService'
import {CollabService} from '@/services/CollabService'

beforeEach(() => {
  vi.restoreAllMocks()
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
        codeTheme: 'dracula',
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
