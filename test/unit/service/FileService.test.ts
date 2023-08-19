import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import * as Y from 'yjs'

import {createState} from '@/state'
import {FileService} from '@/services/FileService'
import {Ctrl} from '@/services'
import {createYdoc} from '../util'

vi.mock('@/db', () => mock())
vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
})

const ctrl = mockDeep<Ctrl>()

test('only save file type', async () => {
  const ydoc = createYdoc('1', 'Test')

  const [store, setState] = createStore(createState({
    files: [{id: '1', ydoc: Y.encodeStateAsUpdate(ydoc)}],
  }))

  const service = new FileService(ctrl, store, setState)
  setState('collab', {ydoc})

  ydoc.getText('2').insert(0, '1')
  expect(ydoc.getText('2').length).toBe(1)
  expect(ydoc.getXmlFragment('1').length).toBe(1)

  ydoc.getXmlFragment('1').push([new Y.XmlText('1')])
  expect(ydoc.getXmlFragment('1').length).toBe(2)

  service.updateFile('1', {})

  const fileYdoc = new Y.Doc()
  Y.applyUpdate(fileYdoc, store.files[0].ydoc)

  expect(fileYdoc?.getXmlFragment('1').length).toBe(2)
  expect(fileYdoc?.getText('2').length).toBe(0)
})
