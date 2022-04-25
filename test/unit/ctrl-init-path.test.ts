import {vi, expect, test} from 'vitest'
import {createCtrl} from '../../src/ctrl'
import {newState} from '../../src/state'
import {createEmptyText} from '../../src/prosemirror'

const lastModified = new Date()

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('../../src/remote', () => ({
  getArgs: async () => ({}),
  getFileLastModified: async () => lastModified,
  readFile: async (path: string) => {
    return path === 'file1' ? '# File1' : ''
  },
}))

vi.mock('idb-keyval', () => ({
  get: async () => JSON.stringify(newState({
    path: 'file1',
  })),
  set: async () => undefined,
}))

test('init - no state', async () => {
  const [store, ctrl] = createCtrl(newState())
  await ctrl.init()
  expect(store.path).toBe('file1')
  expect(store.editorView).toBe(undefined)
})

test('init - check text', async () => {
  const [store, ctrl] = createCtrl(newState())
  const target = document.createElement('div')
  ctrl.updateEditorState(store, createEmptyText())
  ctrl.createEditorView(target)
  await ctrl.init()
  expect(store.path).toBe('file1')
  expect(store.editorView.state.doc.textContent).toBe('File1')
})
