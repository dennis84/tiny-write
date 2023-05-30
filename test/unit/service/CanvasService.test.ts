import {beforeEach, expect, test, vi} from 'vitest'

import {Canvas, CanvasEditorElement, CanvasLinkElement, createState, EdgeType, ElementType} from '@/state'
import {CanvasService} from '@/services/CanvasService'
import {createStore} from 'solid-js/store'
import {Ctrl} from '@/services'

vi.stubGlobal('innerWidth', 1000)
vi.stubGlobal('innerHeight', 1000)

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({
  updateCanvas: vi.fn(),
  deleteCanvas: vi.fn(),
}))

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: '1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  active: false,
  lastModified: new Date(),
  ...props,
})

const createEditorElement = (props: Partial<CanvasEditorElement> = {}): CanvasEditorElement => ({
  id: '1',
  type: ElementType.Editor,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...props,
})

const createLinkElement = (props: Partial<CanvasLinkElement> = {}): CanvasLinkElement => ({
  id: '1',
  type: ElementType.Link,
  from: '1',
  fromEdge: EdgeType.Left,
  to: '2',
  toEdge: EdgeType.Right,
  ...props,
})

beforeEach(() => {
  vi.restoreAllMocks()
})

test('currentCanvas - empty', () => {
  const [store, setState] = createStore(createState({canvases: []}))
  const service = new CanvasService({} as Ctrl, store, setState)
  expect(service.currentCanvas).toBeUndefined()
})

test('currentCanvas', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({id: '1'}),
      createCanvas({id: '2', active: true}),
    ]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  expect(service.currentCanvas?.id).toBe('2')
})

test('updateCanvas', async () => {
  const [store, setState] = createStore(createState({
    canvases: [createCanvas({id: '1', active: true})]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  service.updateCanvas('1', {camera: {point: [10, 10], zoom: 2}})

  expect(service.currentCanvas?.camera.point).toEqual([10, 10])
  expect(service.currentCanvas?.camera.zoom).toEqual(2)

  service.updateCanvas('1', {elements: [createEditorElement()]})
  expect(service.currentCanvas?.elements.length).toBe(1)
  expect(service.currentCanvas?.elements[0].id).toBe('1')
})

test('updateCanvasElement', async () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2'}),
          createLinkElement({id: '3', from: '1', to: '2'}),
        ],
        active: true,
      })
    ]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  service.updateCanvasElement('1', 0, {type: ElementType.Editor, x: 100, y: 100})

  const editorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editorEl.x).toBe(100)
  expect(editorEl.y).toBe(100)

  service.updateCanvasElement('1', 2, {
    type: ElementType.Link,
    fromEdge: EdgeType.Bottom,
    toEdge: EdgeType.Bottom,
  })

  const linkEl = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(linkEl.fromEdge).toBe(EdgeType.Bottom)
  expect(linkEl.toEdge).toBe(EdgeType.Bottom)

  service.updateCanvasElement('1', 0, {selected: true, active: true})
  const selectedEditorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(selectedEditorEl.selected).toBe(true)
  expect(selectedEditorEl.active).toBe(true)

  service.updateCanvasElement('1', 2, {selected: true})
  const selectedLinkEl = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(selectedLinkEl.selected).toBe(true)
})

test('backToContent', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2', x: 900, y: 900}),
        ],
        active: true,
      })
    ]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  service.backToContent()

  expect(service.currentCanvas?.camera.point).toEqual([500, 500])
  expect(service.currentCanvas?.camera.zoom).toEqual(0.5)
})

test('updateCamera', () => {
  const [store, setState] = createStore(createState({
    canvases: [createCanvas({id: '1', active: true})]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  service.updateCamera({point: [100, 100], zoom: 2})

  expect(service.currentCanvas?.camera.point).toEqual([100, 100])
  expect(service.currentCanvas?.camera.zoom).toEqual(2)
})

test('updateCameraPoint', () => {
  const [store, setState] = createStore(createState({
    canvases: [createCanvas({id: '1', active: true})]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  service.updateCameraPoint([100, 100])

  expect(service.currentCanvas?.camera.point).toEqual([100, 100])
})

test('deleteCanvas', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({id: '1', active: true}),
      createCanvas({id: '2', active: false}),
    ]
  }))

  const service = new CanvasService({} as Ctrl, store, setState)

  service.deleteCanvas('2')
  expect(store.canvases.length).toBe(1)

  service.deleteCanvas('1')
  expect(store.canvases.length).toBe(0)
})

test('select', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2'}),
        ],
      }),
    ],
  }))

  const service = new CanvasService({} as Ctrl, store, setState)

  service.select('1')
  const editor = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editor.selected).toBe(true)
  expect(editor.active).toBe(false)

  service.select('1', true)
  const editor2 = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editor2.selected).toBe(true)
  expect(editor2.active).toBe(true)

  service.select('2', true)
  const editor3 = service.currentCanvas?.elements[0] as CanvasEditorElement
  const editor4 = service.currentCanvas?.elements[1] as CanvasEditorElement
  expect(editor3.selected).toBe(false)
  expect(editor3.active).toBe(false)
  expect(editor4.selected).toBe(true)
  expect(editor4.active).toBe(true)
})

test('deselect', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1', selected: true, active: true}),
        ],
      }),
    ],
  }))

  const service = new CanvasService({} as Ctrl, store, setState)
  service.deselect()

  const editor = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editor.selected).toBe(false)
  expect(editor.active).toBe(false)
})
