import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'

import {
  Canvas,
  CanvasEditorElement,
  CanvasLinkElement,
  CanvasImageElement,
  EdgeType,
  ElementType,
  createState,
} from '@/state'
import {createCtrl, Ctrl} from '@/services'
import {CanvasService} from '@/services/CanvasService'
import {createYUpdate, waitFor} from '../util'

vi.stubGlobal('innerWidth', 1000)
vi.stubGlobal('innerHeight', 1000)

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({
  updateCanvas: vi.fn(),
  deleteCanvas: vi.fn(),
  setMeta: vi.fn(),
  getFiles: vi.fn(),
  updateFile: vi.fn(),
  setSize: vi.fn(),
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

const createImageElement = (props: Partial<CanvasImageElement> = {}): CanvasImageElement => ({
  id: '1',
  type: ElementType.Image,
  src: '/path/1.png',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...props,
})

beforeEach(() => {
  vi.restoreAllMocks()
})

const ctrl = mockDeep<Ctrl>()

test('currentCanvas - empty', () => {
  const [store, setState] = createStore(createState({canvases: []}))
  const service = new CanvasService(ctrl, store, setState)
  expect(service.currentCanvas).toBeUndefined()
})

test('currentCanvas', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({id: '1'}),
      createCanvas({id: '2', active: true}),
    ]
  }))

  const service = new CanvasService(ctrl, store, setState)
  expect(service.currentCanvas?.id).toBe('2')
})

test('updateCanvas', async () => {
  const [store, setState] = createStore(createState({
    canvases: [createCanvas({id: '1', active: true})]
  }))

  const service = new CanvasService(ctrl, store, setState)
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
          createImageElement({id: '4'}),
        ],
        active: true,
      })
    ]
  }))

  const service = new CanvasService(ctrl, store, setState)
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

  service.updateCanvasElement('1', 3, {
    type: ElementType.Image,
    width: 200,
    height: 200,
  })

  const imageEl = service.currentCanvas?.elements[3] as CanvasImageElement
  expect(imageEl.width).toBe(200)
  expect(imageEl.height).toBe(200)
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

  const service = new CanvasService(ctrl, store, setState)
  service.backToContent()

  expect(service.currentCanvas?.camera.point).toEqual([500, 500])
  expect(service.currentCanvas?.camera.zoom).toEqual(0.5)
})

test('updateCamera', () => {
  const [store, setState] = createStore(createState({
    canvases: [createCanvas({id: '1', active: true})]
  }))

  const service = new CanvasService(ctrl, store, setState)
  service.updateCamera({point: [100, 100], zoom: 2})

  expect(service.currentCanvas?.camera.point).toEqual([100, 100])
  expect(service.currentCanvas?.camera.zoom).toEqual(2)
})

test('updateCameraPoint', () => {
  const [store, setState] = createStore(createState({
    canvases: [createCanvas({id: '1', active: true})]
  }))

  const service = new CanvasService(ctrl, store, setState)
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

  const service = new CanvasService(ctrl, store, setState)

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

  const service = new CanvasService(ctrl, store, setState)

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

  const service = new CanvasService(ctrl, store, setState)
  service.deselect()

  const editor = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editor.selected).toBe(false)
  expect(editor.active).toBe(false)
})

test('newCanvas', () => {
  const [store, setState] = createStore(createState({canvases: []}))
  ctrl.collab.create.mockReturnValue({})

  const service = new CanvasService(ctrl, store, setState)
  service.newCanvas()

  expect(store.canvases.length).toBe(1)
  expect(store.canvases[0].active).toBe(true)

  service.newCanvas()
  expect(store.canvases.length).toBe(2)
  expect(store.canvases[0].active).toBe(false)
  expect(store.canvases[1].active).toBe(true)

  expect(ctrl.collab.create.mock.calls.length).toBe(2)
})

test('removeElement', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2'}),
          createLinkElement({id: '3', from: '1', to: '2'}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)
  service.removeElement('1')

  expect(service.currentCanvas?.elements.length).toBe(1)
  expect(service.currentCanvas?.elements[0].id).toBe('2')
})

test('destroyElement', () => {
  const editorView = mock<EditorView>()
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1', editorView}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)
  service.destroyElement('1')

  const editorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editorEl.editorView).toBeUndefined()

  expect(editorView.destroy.mock.calls.length).toBe(1)
})

test('open', () => {
  const editorView = mock<EditorView>()
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({id: '1', elements: [createEditorElement({editorView})]}),
      createCanvas({id: '2'}),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)

  service.open('1')
  expect(service.currentCanvas?.id).toBe('1')

  service.open('2')
  expect(service.currentCanvas?.id).toBe('2')

  expect(editorView.destroy.mock.calls.length).toBe(1)
})

test('newFile', () => {
  const ydoc = new Uint8Array()

  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({id: '1', active: true}),
    ],
  }))

  ctrl.file.createFile.mockReturnValue({id: '1', ydoc})
  ctrl.collab.create.mockReturnValue({})

  const service = new CanvasService(ctrl, store, setState)
  service.newFile()

  expect(service.currentCanvas?.elements.length).toBe(1)
  const editorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editorEl.id).toBe('1')
})

test('addImage', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({id: '1', active: true}),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)
  service.addImage('/path/1.png', 100, 100, 1000, 2000)

  expect(service.currentCanvas?.elements.length).toBe(1)
  const imageEl = service.currentCanvas?.elements[0] as CanvasImageElement
  expect(imageEl.x).toBe(100)
  expect(imageEl.x).toBe(100)
  expect(imageEl.width).toBe(300)
  expect(imageEl.height).toBe(600)
})

test('drawLink', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2', x: 300, y: 300}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)

  service.drawLink('3', '1', EdgeType.Right, 0, 0)
  expect(service.currentCanvas?.elements.length).toBe(3)
  const link = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(link.from).toBe('1')
  expect(link.fromEdge).toBe(EdgeType.Right)
  expect(link.to).toBe(undefined)
  expect(link.toX).toBe(0)
  expect(link.toY).toBe(0)

  service.drawLink('3', '1', EdgeType.Right, 100, 100)
  const link1 = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(link1.to).toBe(undefined)
  expect(link1.toX).toBe(100)
  expect(link1.toY).toBe(100)

  service.drawLink('3', '1', EdgeType.Right, 280, 300)
  const link2 = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(link2.to).toBe('2')
  expect(link2.toX).toBe(undefined)
  expect(link2.toY).toBe(undefined)
})

test('drawLink - abort', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2', x: 300, y: 300}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)

  service.drawLink('3', '1', EdgeType.Right, 100, 100)
  expect(service.currentCanvas?.elements.length).toBe(3)

  service.drawLinkEnd('3')
  expect(service.currentCanvas?.elements.length).toBe(2)
})

test('clearCanvas', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1'}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)
  service.clearCanvas()

  expect(service.currentCanvas?.elements.length).toBe(0)
})

test('clearCanvas', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1'}),
          createEditorElement({id: '2', x: 300, y: 300}),
          createLinkElement({id: '3', from: '1', to: '2'}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)
  service.removeLinks()

  expect(service.currentCanvas?.elements.length).toBe(2)
})

test('renderEditor', async () => {
  const element = createEditorElement({id: '1'})
  const init = createState({
    files: [
      {id: '1', ydoc: createYUpdate('1', 'Test'), active: true},
    ],
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [element],
      }),
    ],
  })

  const [, setState] = createStore(init)
  const {ctrl, store} = createCtrl(init)
  const target = document.createElement('div')

  const service = new CanvasService(ctrl, store, setState)
  setState('collab', ctrl.collab.create('test'))

  service.renderEditor(element, target)

  const editor = service.currentCanvas?.elements[0] as CanvasEditorElement

  await waitFor(() => {
    expect(editor?.editorView?.state.doc.textContent).toBe('Test')
  })

  const tr = editor?.editorView?.state.tr
  tr!.insertText('123')
  editor?.editorView?.dispatch(tr!)

  await waitFor(() => {
    expect(editor?.editorView?.state.doc.textContent).toBe('Test123')
  })
})

test('getElementNear', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1', x: 0, y: 0, width: 100, height: 100}),
          createEditorElement({id: '2', x: 200, y: 200, width: 100, height: 100}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)

  expect(service.getElementNear([-10, -20])).toEqual({id: '1', edge: EdgeType.Top})
  expect(service.getElementNear([-20, -10])).toEqual({id: '1', edge: EdgeType.Left})
  expect(service.getElementNear([110, 120])).toEqual({id: '1', edge: EdgeType.Bottom})
  expect(service.getElementNear([120, 110])).toEqual({id: '1', edge: EdgeType.Right})

  expect(service.getElementNear([300, 180])).toEqual({id: '2', edge: EdgeType.Top})
})

test('center', () => {
  const [store, setState] = createStore(createState({
    canvases: [
      createCanvas({
        id: '1',
        active: true,
        elements: [
          createEditorElement({id: '1', x: 0, y: 0, width: 100, height: 100}),
          createEditorElement({id: '2', x: 100, y: 0, width: 100, height: 100}),
          createEditorElement({id: '3', x: 0, y: 100, width: 100, height: 100}),
        ],
      }),
    ],
  }))

  const service = new CanvasService(ctrl, store, setState)

  expect(service.getCenterPoint()?.toArray()).toEqual([100, 100, 1])
})
