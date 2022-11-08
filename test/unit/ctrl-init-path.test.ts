import {vi, expect, test} from 'vitest'

vi.stubGlobal('d3', vi.fn(() => ({
  curveLinear: () => undefined
})))

import {createCtrl} from '../../src/ctrl'
import {createState} from '../../src/state'

const lastModified = new Date()

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('../../src/remote', () => ({
  getArgs: async () => ({}),
  resolvePath: async ([path]) => path,
  getFileLastModified: async () => lastModified,
  readFile: async (path: string) => {
    return path === 'file1' ? '# File1' : ''
  },
}))

vi.mock('idb-keyval', () => ({
  get: async () => JSON.stringify(createState({
    path: 'file1',
  })),
  set: async () => undefined,
}))

test('init - saved path', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.path).toBe('file1')
  expect(store.editorView.state.doc.textContent).toBe('File1')
})
