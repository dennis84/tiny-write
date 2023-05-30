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
