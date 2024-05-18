import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Mode, createState} from '@/state'
import {createCtrl} from '@/services'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

beforeEach(() => {
  vi.restoreAllMocks()
})

test('newFile', async () => {
  const {store, ctrl} = createCtrl(createState())
  await ctrl.app.init()
  expect(store.mode).toBe(Mode.Editor)

  await ctrl.code.newFile()
  expect(store.mode).toBe(Mode.Code)
  expect(store.files.length).toBe(2)
  expect(store.files[1].code).toBe(true)
  expect(store.files[1].active).toBe(true)
})
