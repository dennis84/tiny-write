import {vi, expect, test} from 'vitest'

vi.stubGlobal('d3', vi.fn(() => ({
  curveLinear: () => undefined
})))

import {createCtrl} from '../../src/ctrl'
import {createState} from '../../src/state'

const lastModified = new Date()

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => '',
})))


vi.mock('../../src/env', () => ({
  mod: 'Cmd',
  isTauri: true,
  isDark: () => true,
}))

vi.mock('../../src/remote', () => ({
  getArgs: async () => ({
    file: 'file2',
  }),
  getFileLastModified: async () => lastModified,
  resolvePath: async ([path]) => path,
  readFile: async (path: string) =>
    path === 'file1' ? '# File1' :
    path === 'file2' ? '# File2' : ''
}))

vi.mock('idb-keyval', () => ({
  get: async () => undefined,
  set: async () => undefined,
}))

vi.mock('y-websocket', () => ({WebsocketProvider: class {
  awareness = {
    setLocalStateField: () => undefined,
    on: () => undefined,
    off: () => undefined,
    getLocalState: () => undefined,
  }
  disconnect() { /**/ }
}}))

test('init - check text', async () => {
  const [store, ctrl] = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.path).toBe('file2')
  expect(store.editorView.state.doc.textContent).toBe('File2')
})
