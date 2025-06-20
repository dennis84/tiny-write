import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import type {EditorView} from 'prosemirror-view'
import {Box, Vector} from '@flatten-js/core'
import {
  type Canvas,
  type CanvasEditorElement,
  type CanvasLinkElement,
  type CanvasImageElement,
  EdgeType,
  ElementType,
  createState,
  type CanvasVideoElement,
  Page,
} from '@/state'
import {DB} from '@/db'
import {BoxUtil} from '@/utils/BoxUtil'
import {CanvasService} from '@/services/CanvasService'
import {FileService} from '@/services/FileService'
import type {SelectService} from '@/services/SelectService'
import {CollabService} from '@/services/CollabService'
import {createCollabMock} from '../util/util'
import {createYUpdate} from '../util/prosemirror-util'

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({DB: mock()}))

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: '1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
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

const fileService = mock<FileService>()
const selectService = mock<SelectService>()

test('currentCanvas - empty', () => {
  const [store, setState] = createStore(createState({canvases: []}))
  const service = new CanvasService(fileService, selectService, store, setState)
  expect(service.currentCanvas).toBeUndefined()
})

test('currentCanvas', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/2',
        page: Page.Canvas,
        canvasId: '2',
      },
      canvases: [createCanvas({id: '1'}), createCanvas({id: '2'})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  expect(service.currentCanvas?.id).toBe('2')
})

test('updateCanvas', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.updateCanvas('1', {camera: {point: [10, 10], zoom: 2}})

  expect(service.currentCanvas?.camera.point).toEqual([10, 10])
  expect(service.currentCanvas?.camera.zoom).toEqual(2)

  service.updateCanvas('1', {elements: [createEditorElement()]})
  expect(service.currentCanvas?.elements.length).toBe(1)
  expect(service.currentCanvas?.elements[0].id).toBe('1')
})

test('updateCanvasElement', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1'}),
            createEditorElement({id: '2'}),
            createLinkElement({id: '3', from: '1', to: '2'}),
            createImageElement({id: '4'}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  // update editor element
  service.updateCanvasElement('1', {x: 100, y: 100})
  const editorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editorEl.x).toBe(100)
  expect(editorEl.y).toBe(100)

  // update link
  service.updateCanvasElement('3', {
    fromEdge: EdgeType.Bottom,
    toEdge: EdgeType.Bottom,
  })

  const linkEl = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(linkEl.fromEdge).toBe(EdgeType.Bottom)
  expect(linkEl.toEdge).toBe(EdgeType.Bottom)

  // select and activate
  service.updateCanvasElement('1', {selected: true, active: true})
  const selectedEditorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(selectedEditorEl.selected).toBe(true)
  expect(selectedEditorEl.active).toBe(true)

  // only select
  service.updateCanvasElement('3', {selected: true})
  const selectedLinkEl = service.currentCanvas?.elements[2] as CanvasLinkElement
  expect(selectedLinkEl.selected).toBe(true)

  // update image
  service.updateCanvasElement('4', {
    width: 200,
    height: 200,
  })

  const imageEl = service.currentCanvas?.elements[3] as CanvasImageElement
  expect(imageEl.width).toBe(200)
  expect(imageEl.height).toBe(200)
})

test('backToContent', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1'}),
            createEditorElement({id: '2', x: 900, y: 900}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.canvasRef = mock<HTMLElement>({
    clientWidth: 1000,
    clientHeight: 1000,
  })

  await service.backToContent()

  expect(service.currentCanvas?.camera.point).toEqual([500, 500])
  expect(service.currentCanvas?.camera.zoom).toEqual(0.5)
})

test('focus', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [createEditorElement({id: '2', x: 500, y: 500, width: 200, height: 200})],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.canvasRef = mock<HTMLElement>({
    clientWidth: 1000,
    clientHeight: 1000,
  })

  await service.focus('2')

  expect(service.currentCanvas?.camera.point).toEqual([-100, -100])
})

test('snapToGrid', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.snapToGrid()
  expect(service.currentCanvas?.snapToGrid).toBe(true)

  service.snapToGrid()
  expect(service.currentCanvas?.snapToGrid).toBe(false)
})

test('updateCamera', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.updateCamera({point: [100, 100], zoom: 2})

  expect(service.currentCanvas?.camera.point).toEqual([100, 100])
  expect(service.currentCanvas?.camera.zoom).toEqual(2)
})

test('updateCameraPoint', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.updateCameraPoint([100, 100])

  expect(service.currentCanvas?.camera.point).toEqual([100, 100])
})

test('restore', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'}), createCanvas({id: '2', deleted: true})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.restore('2')
  expect(store.canvases.length).toBe(2)
  expect(store.canvases[1].deleted).toBe(false)
})

test('select', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [createEditorElement({id: '1'}), createEditorElement({id: '2'})],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

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
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [createEditorElement({id: '1', selected: true, active: true})],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.deselect()

  const editor = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editor.selected).toBe(false)
  expect(editor.active).toBe(false)
})

test('newCanvas', async () => {
  const editorView = mock<EditorView>()
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      files: [{id: '1', ydoc: createYUpdate('1', []), versions: [], editorView}],
      canvases: [
        createCanvas({
          id: '1',
          elements: [createEditorElement({id: '1', selected: true, active: true})],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  // new canvas
  await service.newCanvas()
  expect(store.canvases.length).toBe(2)

  // Add another canvas
  await service.newCanvas()
  expect(store.canvases.length).toBe(3)
})

test('removeElements', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1'}),
            createEditorElement({id: '2'}),
            createLinkElement({id: '3', from: '1', to: '2'}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.removeElements(['1'])

  expect(service.currentCanvas?.elements.length).toBe(1)
  expect(service.currentCanvas?.elements[0].id).toBe('2')
})

test('open', async () => {
  const editorView = vi.mocked<EditorView>({destroy: vi.fn()} as any)
  const [store, setState] = createStore(
    createState({
      files: [{id: '1', ydoc: createYUpdate('1', []), versions: [], editorView}],
      canvases: [
        createCanvas({id: '1', elements: [createEditorElement({id: '1'})]}),
        createCanvas({id: '2'}),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.open('1')
  expect(DB.updateCanvas).toBeCalledTimes(1)
  vi.mocked(DB.updateCanvas).mockClear()

  await service.open('2')
  expect(DB.updateCanvas).toBeCalledTimes(1)

  expect(store.files[0].editorView).toBeUndefined()
  expect(editorView.destroy.mock.calls.length).toBe(1)
})

test('newFile', async () => {
  const ydoc = new Uint8Array()

  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'})],
    }),
  )

  vi.spyOn(FileService, 'createFile').mockReturnValue({id: '1', ydoc, versions: []})
  vi.spyOn(CollabService, 'create').mockReturnValue(createCollabMock())

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.newFile()

  expect(service.currentCanvas?.elements.length).toBe(1)
  const editorEl = service.currentCanvas?.elements[0] as CanvasEditorElement
  expect(editorEl.id).toBe('1')
})

test.each([
  {toX: 400, toY: 175, x: 400, y: 0, edge: EdgeType.Left},
  {toX: -400, toY: 175, x: -700, y: 0, edge: EdgeType.Right},
  {toX: 150, toY: 400, x: 0, y: 400, edge: EdgeType.Top},
  {toX: 150, toY: -400, x: 0, y: -750, edge: EdgeType.Bottom},
])('newFile - with link', async ({toX, toY, x, y, edge}) => {
  const ydoc = new Uint8Array()
  const link = createLinkElement({id: '2', from: '1', toX, toY, to: undefined})

  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [createEditorElement({id: '1'}), link],
        }),
      ],
    }),
  )

  vi.spyOn(FileService, 'createFile').mockReturnValue({id: '3', ydoc, versions: []})
  vi.spyOn(CollabService, 'create').mockReturnValue(createCollabMock())

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.newFile(false, link)

  expect(service.currentCanvas?.elements.length).toBe(3)
  const editorEl = service.currentCanvas?.elements[2] as CanvasEditorElement
  expect(editorEl.id).toBe('3')
  expect(editorEl.x).toBe(x)
  expect(editorEl.y).toBe(y)

  const linkEl = service.currentCanvas?.elements[1] as CanvasLinkElement
  expect(linkEl.toX).toBe(undefined)
  expect(linkEl.toY).toBe(undefined)
  expect(linkEl.to).toBe('3')
  expect(linkEl.toEdge).toBe(edge)
})

test('addImage', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.addImage('/path/1.png', new Vector(100, 100), 1000, 2000)

  expect(service.currentCanvas?.elements.length).toBe(1)
  const imageEl = service.currentCanvas?.elements[0] as CanvasImageElement
  expect(imageEl.x).toBe(-50)
  expect(imageEl.y).toBe(-200)
  expect(imageEl.width).toBe(300)
  expect(imageEl.height).toBe(600)
})

test('addVideo', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [createCanvas({id: '1'})],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.addVideo('/path/1.mp4', 'video/mp4', new Vector(100, 100), 1000, 2000)

  expect(service.currentCanvas?.elements.length).toBe(1)
  const el = service.currentCanvas?.elements[0] as CanvasVideoElement
  expect(el.mime).toBe('video/mp4')
  expect(el.x).toBe(-50)
  expect(el.y).toBe(-200)
  expect(el.width).toBe(300)
  expect(el.height).toBe(600)
})

test('drawLink', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1'}),
            createEditorElement({id: '2', x: 300, y: 300}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

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

test('drawLink - abort', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1'}),
            createEditorElement({id: '2', x: 300, y: 300}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  service.drawLink('3', '1', EdgeType.Right, 100, 100)
  expect(service.currentCanvas?.elements.length).toBe(3)

  await service.drawLinkEnd('3')
  expect(service.currentCanvas?.elements.length).toBe(3)
  expect(service.findDeadLinks().length).toBe(1)
})

test('removeDeadLinks', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1'}),
            createLinkElement({id: '2', from: '1', toX: 0, toY: 0, to: undefined}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  expect(service.currentCanvas?.elements.length).toBe(2)

  await service.removeDeadLinks()

  expect(service.currentCanvas?.elements.length).toBe(1)
})

test('clearCanvas', async () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [createEditorElement({id: '1'})],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  await service.clearCanvas()

  expect(service.currentCanvas?.elements.length).toBe(0)
})

test('getElementNear', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1', x: 0, y: 0, width: 100, height: 100}),
            createEditorElement({id: '2', x: 200, y: 200, width: 100, height: 100}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  expect(service.getElementNear([-10, -20])).toEqual({id: '1', edge: EdgeType.Top})
  expect(service.getElementNear([-20, -10])).toEqual({id: '1', edge: EdgeType.Left})
  expect(service.getElementNear([110, 120])).toEqual({id: '1', edge: EdgeType.Bottom})
  expect(service.getElementNear([120, 110])).toEqual({id: '1', edge: EdgeType.Right})

  expect(service.getElementNear([300, 180])).toEqual({id: '2', edge: EdgeType.Top})
})

test('center', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1', x: 0, y: 0, width: 100, height: 100}),
            createEditorElement({id: '2', x: 100, y: 0, width: 100, height: 100}),
            createEditorElement({id: '3', x: 0, y: 100, width: 100, height: 100}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  const centerPoint = service.getCenterPoint()
  expect(centerPoint?.x).toEqual(100)
  expect(centerPoint?.y).toEqual(100)
})

test('get selection', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1', x: 0, y: 0, width: 100, height: 100}),
            createEditorElement({id: '2', x: 100, y: 0, width: 100, height: 100}),
            createEditorElement({id: '3', x: 0, y: 100, width: 100, height: 100}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  expect(service.selection).toBe(undefined)

  service.select('1')
  expect(service.selection).toBe(undefined) // No selection if only one selected

  service.select('2', false, true)
  expect(service.selection).not.toBe(undefined)
  expect(BoxUtil.toRect(service.selection?.box)).toMatchObject({
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  })
  expect(service.selection?.elements.length).toBe(2)

  service.select('3', false, true)
  expect(BoxUtil.toRect(service.selection?.box)).toMatchObject({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  })
  expect(service.selection?.elements.length).toBe(3)
})

test('selectBox', () => {
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({id: '1', x: 0, y: 0, width: 100, height: 100}),
            createEditorElement({id: '2', x: 100, y: 0, width: 100, height: 100}),
            createEditorElement({id: '3', x: 0, y: 100, width: 100, height: 100}),
          ],
        }),
      ],
    }),
  )

  const service = new CanvasService(fileService, selectService, store, setState)

  expect(service.selection).toBe(undefined)

  service.selectBox(new Box(0, 0, 10, 10), true, false)
  expect(service.selection).toBe(undefined) // No selection if only one selected
  expect(store.canvases[0].elements[0].selected).toBe(true)

  service.selectBox(new Box(0, 0, 110, 0), false, false)
  expect(service.selection).not.toBe(undefined)
  expect(BoxUtil.toRect(service.selection?.box)).toMatchObject({
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  })
  expect(service.selection?.elements.length).toBe(2)

  service.selectBox(new Box(0, 0, 110, 110), false, false)
  expect(BoxUtil.toRect(service.selection?.box)).toMatchObject({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  })
  expect(service.selection?.elements.length).toBe(3)

  service.selectBox(new Box(0, 0, 110, 90), false, false)
  expect(BoxUtil.toRect(service.selection?.box)).toMatchObject({
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  })
  expect(service.selection?.elements.length).toBe(2)
})

test('selectBox - active editor', () => {
  const editorView = mock<EditorView>()
  const [store, setState] = createStore(
    createState({
      lastLocation: {
        path: '/canvas/1',
        page: Page.Canvas,
        canvasId: '1',
      },
      canvases: [
        createCanvas({
          id: '1',
          elements: [
            createEditorElement({
              id: '1',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              active: true,
              selected: true,
            }),
            createEditorElement({id: '2', x: 100, y: 0, width: 100, height: 100}),
          ],
        }),
      ],
    }),
  )

  fileService.findFileById.mockReturnValue({
    id: '1',
    ydoc: createYUpdate('1', []),
    versions: [],
    editorView,
  })

  const service = new CanvasService(fileService, selectService, store, setState)

  expect(service.selection).toBe(undefined)

  service.selectBox(new Box(0, 0, 110, 10), true, false)
  expect(service.selection).toBe(undefined)
  expect(selectService.selectBox).toHaveBeenCalled()
})
