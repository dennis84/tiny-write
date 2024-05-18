import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'

import {createState} from '@/state'
import {createCtrl} from '@/services'
import {getText, insertText, waitFor} from '../util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

beforeEach(() => {
  vi.restoreAllMocks()
})

test('addVersion', async () => {
  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(ctrl.file.currentFile!.id, target)

  insertText(ctrl, 'Test')
  expect(getText(ctrl)).toBe('Test')
  expect(ctrl.file.currentFile?.versions.length).toBe(0)

  await ctrl.changeSet.addVersion()
  expect(ctrl.file.currentFile?.versions.length).toBe(1)

  insertText(ctrl, '123')
  expect(getText(ctrl)).toBe('Test123')

  ctrl.changeSet.renderVersion(ctrl.file.currentFile!.versions[0]!)
  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
  })

  ctrl.changeSet.applyVersion(ctrl.file.currentFile!.versions[0]!)
  await waitFor(() => {
    expect(getText(ctrl)).toBe('Test')
  })
})
