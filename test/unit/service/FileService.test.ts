import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import * as Y from 'yjs'

import {CanvasEditorElement, CanvasLinkElement, ElementType, Mode, createState} from '@/state'
import {FileService} from '@/services/FileService'
import {Ctrl} from '@/services'
import {createYUpdate, createYdoc} from '../util'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('mermaid', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
})

const ctrl = mockDeep<Ctrl>()

test('only save file type', async () => {
  const ydoc = createYdoc('1', 'Test')

  const [store, setState] = createStore(createState({
    files: [{id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: []}],
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

test('deleteFile', async () => {
  const ydoc = createYdoc('1', 'Test')

  const [store, setState] = createStore(createState({
    files: [
      {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], active: true},
      {id: '2', ydoc: createYUpdate('2', 'Test2'), versions: []},
    ],
  }))

  const service = new FileService(ctrl, store, setState)
  setState('collab', {ydoc})
  setState('mode', Mode.Editor)

  service.deleteFile({id: '1'})
  expect(store.files.length).toBe(2)
  expect(store.files[0].deleted).toBe(true)
  expect(store.files[0].active).toBe(false)
  expect(ctrl.editor.openFile).toHaveBeenCalledWith({id: '2'})

  await service.deleteFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.files[1].deleted).toBe(true)
})

test('restore', async () => {
  const ydoc = createYdoc('1', 'Test')

  const [store, setState] = createStore(createState({
    files: [
      {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], active: true},
      {id: '2', ydoc: createYUpdate('2', 'Test2'), versions: [], active: false, deleted: true},
    ],
  }))

  const service = new FileService(ctrl, store, setState)
  setState('collab', {ydoc})
  setState('mode', Mode.Editor)

  service.restore('2')
  expect(store.files.length).toBe(2)
  expect(store.files[0].active).toBe(true)
  expect(store.files[1].active).toBe(false)
  expect(store.files[1].deleted).toBe(false)
})

test('deleteForever', async () => {
  const ydoc = createYdoc('1', 'Test')

  const [store, setState] = createStore(createState({
    files: [
      {id: '1', ydoc: Y.encodeStateAsUpdate(ydoc), versions: [], active: true},
      {id: '2', ydoc: createYUpdate('2', 'Test2'), versions: [], active: false, deleted: true},
    ],
    canvases: [
      {
        id: '1',
        active: true,
        camera: {point: [0, 0], zoom: 1},
        elements: [
          {id: '1', type: ElementType.Editor, x: 0, y: 0, width: 100, height: 100} as CanvasEditorElement,
          {id: '2', type: ElementType.Editor, x: 0, y: 0, width: 100, height: 100} as CanvasEditorElement,
          {id: '3', type: ElementType.Link, from: '1', to: '2'} as CanvasLinkElement,
        ]
      }
    ]
  }))

  const service = new FileService(ctrl, store, setState)
  setState('collab', {ydoc})
  setState('mode', Mode.Editor)

  service.deleteForever('2')
  expect(store.files.length).toBe(1)
  expect(store.files[0].active).toBe(true)
  expect(store.canvases[0].elements.length).toBe(1)
  expect(store.canvases[0].elements[0].id).toBe('1')
})
