import {vi, expect, test} from 'vitest'
import {createCtrl} from '../../src/ctrl'
import {newState} from '../../src/state'
import {createEmptyText} from '../../src/prosemirror'

const lastModified = new Date()

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('../../src/env', () => ({
  mod: 'Cmd',
  isTauri: true
}))

vi.mock('../../src/remote', () => ({
  getArgs: async () => ({
    file: 'file2',
  }),
  getFileLastModified: async () => lastModified,
  readFile: async (path: string) =>
    path === 'file1' ? '# File1' :
    path === 'file2' ? '# File2' : ''
}))

vi.mock('../../src/db', () => ({
  get: async () => undefined,
  set: async () => undefined,
}))

test('init - no state', async () => {
  const [store, ctrl] = createCtrl(newState())
  await ctrl.init()
  expect(store.path).toBe('file2')
  expect(store.editorView).toBe(undefined)
})

test('init - check text', async () => {
  const [store, ctrl] = createCtrl(newState())
  const target = document.createElement('div')
  ctrl.updateEditorState(store, createEmptyText())
  ctrl.createEditorView(target)
  await ctrl.init()
  expect(store.path).toBe('file2')
  expect(store.editorView.state.doc.textContent).toBe('File2')
})
