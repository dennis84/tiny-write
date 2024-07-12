import {expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {Mode, createState} from '@/state'
import {Ctrl} from '@/services'
import {CollabService} from '@/services/CollabService'

vi.mock('@/db', () => ({DB: mock()}))

const ctrl = mockDeep<Ctrl>()

const WsMock = vi.fn()

vi.stubGlobal('WebSocket', WsMock)

test('init', () => {
  const collab = CollabService.create('123', Mode.Editor, true)

  // connection will be established directly
  expect(WsMock).toBeCalled()

  const [store, setState] = createStore(createState({collab}))

  const service = new CollabService(ctrl, store, setState)

  // register events
  service.init()
  collab.ydoc.getMap('config').set('font', 'test')
  expect(store.config.font).toBe('test')

  // create new collab (open another file)

  // no sync without init
  const newCollab = CollabService.create('1234', Mode.Editor, true)
  setState('collab', newCollab)
  collab.ydoc.getMap('config').set('font', 'test123')
  expect(store.config.font).toBe('test')

  // after init
  service.init()
  collab.ydoc.getMap('config').set('font', 'test123')
  expect(store.config.font).toBe('test123')
})
