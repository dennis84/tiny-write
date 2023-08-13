import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import * as Y from 'yjs'

import {Canvas, CanvasEditorElement, createState, ElementType} from '@/state'
import {CanvasCollabService} from '@/services/CanvasCollabService'
import {CanvasService} from '@/services/CanvasService'
import {UndoManager} from '@/services/CollabService'

beforeEach(() => {
  vi.restoreAllMocks()
})

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: 'c1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  active: false,
  lastModified: new Date(),
  ...props,
})

const setup = (props: {canvas: Partial<Canvas>} = {canvas: {}}) => {
  const canvas = createCanvas(props.canvas)
  const canvasService = mock<CanvasService>({currentCanvas: canvas})

  const [store, setState] = createStore(createState({canvases: []}))
  const service = new CanvasCollabService(canvasService, store)

  const ydoc = new Y.Doc({gc: false})
  setState('collab', {ydoc})

  const undoManager = new UndoManager(service.elements!, {
    trackedOrigins: new Set([ydoc.clientID]),
  })

  return {service, canvasService, undoManager}
}

test('init', () => {
  const {service, canvasService, undoManager} = setup({
    canvas: {
      elements: [{
        id: '1',
        type: ElementType.Editor,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      } as CanvasEditorElement]
    }
  })

  service.init()

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', type: ElementType.Editor, x: 0, y: 0, width: 100, height: 100}
  })

  // Undo do nothing
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', type: ElementType.Editor, x: 0, y: 0, width: 100, height: 100}
  })

  // Add element
  service.addElement({id: '2', x: 0, y: 0})

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', type: ElementType.Editor, x: 0, y: 0, width: 100, height: 100},
    '2': {id: '2', x: 0, y: 0},
  })

  // Undo add
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', type: ElementType.Editor, x: 0, y: 0, width: 100, height: 100}
  })

  expect(canvasService.removeElement).toHaveBeenCalledWith('2')
})

test('addElement', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()

  // Add element
  service.addElement({id: '1', x: 0, y: 0})

  // Undo add
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({})
  expect(canvasService.removeElement).toHaveBeenCalledWith('1')
})

test('addElements', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()

  // Add element
  service.addElements([
    {id: '1', x: 0, y: 0},
    {id: '2', x: 1, y: 1},
  ])

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', x: 0, y: 0},
    '2': {id: '2', x: 1, y: 1},
  })

  // Undo add
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({})
  expect(canvasService.removeElement).toHaveBeenCalledTimes(2)
})

test('updateElement', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()
  service.addElement({id: '1', x: 0, y: 0})
  undoManager.stopCapturing()

  // Update element
  service.updateElement({id: '1', x: 1})
  expect(service.elements?.toJSON()).toEqual({'1': {id: '1', x: 1, y: 0}})

  // Undo update
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({'1': {id: '1', x: 0, y: 0}})
  expect(canvasService.updateCanvasElement).toHaveBeenCalledWith('1', {x: 0})
})

test('updateElement - add prop', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()
  service.addElement({id: '1', x: 0, y: 0})
  undoManager.stopCapturing()

  // Update element
  service.updateElement({id: '1', z: 1})
  expect(service.elements?.toJSON()).toEqual({'1': {id: '1', x: 0, y: 0, z: 1}})

  // Undo update
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({'1': {id: '1', x: 0, y: 0}})

  expect(canvasService.updateCanvasElement).toHaveBeenCalledWith('1', {z: undefined})
})

test('removeElement', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()

  service.addElement({id: '1', x: 0, y: 0})
  undoManager.stopCapturing()

  // Remove element
  service.removeElement('1')
  expect(service.elements?.toJSON()).toEqual({})

  // Undo remove
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({'1': {id: '1', x: 0, y: 0}})
  expect(canvasService.updateCanvas).toHaveBeenCalledWith('c1', {
    elements: [{id: '1', x: 0, y: 0}],
  })
})

test('hasElement', () => {
  const {service} = setup()

  service.init()

  service.addElement({id: '1', x: 0, y: 0})
  expect(service.hasElement('1')).toBe(true)
  expect(service.hasElement('2')).toBe(false)
})

test('removeAll', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()

  service.addElement({id: '1', x: 0, y: 0})
  service.addElement({id: '2', x: 1, y: 1})
  undoManager.stopCapturing()

  // Remove all
  service.removeAll()
  expect(service.elements?.toJSON()).toEqual({})

  // Undo remove
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', x: 0, y: 0},
    '2': {id: '2', x: 1, y: 1},
  })

  expect(canvasService.updateCanvas).toHaveBeenCalledTimes(2)
})

test('removeMany', () => {
  const {service, canvasService, undoManager} = setup()

  service.init()

  service.addElement({id: '1', x: 0, y: 0})
  service.addElement({id: '2', x: 1, y: 1})
  service.addElement({id: '3', x: 2, y: 2})
  undoManager.stopCapturing()

  // Remove many
  service.removeMany(['1', '2'])
  expect(service.elements?.toJSON()).toEqual({
    '3': {id: '3', x: 2, y: 2},
  })

  // Undo remove
  undoManager.undo()

  expect(service.elements?.toJSON()).toEqual({
    '1': {id: '1', x: 0, y: 0},
    '2': {id: '2', x: 1, y: 1},
    '3': {id: '3', x: 2, y: 2},
  })

  expect(canvasService.updateCanvas).toHaveBeenCalledTimes(2)
})