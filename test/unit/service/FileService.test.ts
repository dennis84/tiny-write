import {beforeEach, expect, test, vi} from 'vitest'
import * as Y from 'yjs'

import {createState} from '@/state'
import {createYdoc} from '../util'
import {FileService} from '@/services/FileService'
import {createStore} from 'solid-js/store'
import {Ctrl} from '@/services'

vi.mock('@/db', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
})

test('only save file type', async () => {
  const ydoc = createYdoc('1', 'Test')

  const [store, setState] = createStore(createState({
    files: [{id: '1', ydoc: Y.encodeStateAsUpdate(ydoc)}],
  }))

  const ctrl = {} as Ctrl
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
