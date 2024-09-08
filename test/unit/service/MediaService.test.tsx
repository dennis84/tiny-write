import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks, mockConvertFileSrc, mockWindows} from '@tauri-apps/api/mocks'
import {fromBase64} from 'js-base64'
import {render, waitFor} from '@solidjs/testing-library'
import {MediaService} from '@/services/MediaService'
import {createCtrl} from '@/services'
import {CanvasEditorElement, CanvasImageElement, ElementType, Mode, createState} from '@/state'
import {Main} from '@/components/Main'
import {createIpcMock} from '../util/util'
import {createYUpdate} from '../util/prosemirror-util'

document.elementFromPoint = () => null

vi.stubGlobal('location', {
  pathname: '',
  reload: vi.fn(),
})

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  clearMocks()
  vi.clearAllMocks()
  mockWindows('main')
  mockConvertFileSrc('macos')
  createIpcMock()
})

vi.stubGlobal('__TAURI__', {})

const lastModified = new Date()

test('getImagePath', async () => {
  const input = '/path/to/file.png'

  const path = await MediaService.getImagePath(input)
  expect(path).toBe('asset://localhost/' + encodeURIComponent(input))

  const p2 = await MediaService.getImagePath(input, '/base/path')
  expect(p2).toBe('asset://localhost/' + encodeURIComponent('/base/path' + input))
})

test('dropFile - image on editor', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const initial = createState()
  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  const blob = new Blob(['123'])
  await ctrl.media.dropFile(blob, [0, 0])

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  const [, data] = image?.attrs.src.split('base64,') ?? []
  expect(fromBase64(data)).toBe('123')
})

test('dropFile - image on canvas', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/canvas/1'))

  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const initial = createState({
    mode: Mode.Canvas,
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        active: true,
        elements: [editorElement],
      },
    ],
  })

  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = ctrl.canvas.currentCanvas

  const blob = new Blob([], {type: 'image/png'})
  await ctrl.media.dropFile(blob, [100, 100])

  expect(currentCanvas?.elements).toHaveLength(2)

  const imageEl = currentCanvas?.elements.find(
    (it) => it.type === ElementType.Image,
  ) as CanvasImageElement
  expect(imageEl.width).toBe(300) // fixed
  expect(imageEl.height).toBe(600) // keep ratio
  expect(imageEl.x).toBe(-50) // centered
  expect(imageEl.y).toBe(-200) // centered
})

test('dropFile - image on canvas with active editor', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/canvas/1'))

  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const initial = createState({
    mode: Mode.Canvas,
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        active: true,
        elements: [editorElement],
      },
    ],
  })

  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = ctrl.canvas.currentCanvas
  const editorEl = currentCanvas?.elements[0] as CanvasEditorElement
  ctrl.canvas.select('1', true)

  const blob = new Blob(['123'], {type: 'image/png'})
  await ctrl.media.dropFile(blob, [0, 0])

  expect(currentCanvas?.elements).toHaveLength(1)

  const doc = ctrl.file.findFileById(editorEl.id)?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  const [, data] = image?.attrs.src.split('base64,') ?? []
  expect(fromBase64(data)).toBe('123')
})

test('dropPath - image on editor', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const initial = createState()
  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await ctrl.media.dropPath('/users/me/file.png', [0, 0])

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('~/file.png')
})

test('dropPath - image on editor with basePath', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const initial = createState({
    mode: Mode.Editor,
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', []),
        path: '/users/me/project/README.md',
        active: true,
        lastModified,
        versions: [],
      },
    ],
  })

  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await ctrl.media.dropPath('/users/me/project/file.png', [0, 0])

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('./file.png')
})

test('dropPath - text file on editor', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/editor/1'))

  const initial = createState()
  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.files).toHaveLength(1)

  const path = '/users/me/project/README.md'
  const result = await ctrl.media.dropPath(path, [0, 0])

  expect(store.files).toHaveLength(2)
  expect(result?.file?.path).toBe(path)
})

test('dropPath - image on canvas', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000/canvas/1'))

  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const initial = createState({
    mode: Mode.Canvas,
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        active: true,
        elements: [editorElement],
      },
    ],
  })

  const {store, ctrl} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = ctrl.canvas.currentCanvas

  await ctrl.media.dropPath('/users/me/file.png', [100, 100])

  expect(currentCanvas?.elements).toHaveLength(2)

  const imageEl = currentCanvas?.elements.find(
    (it) => it.type === ElementType.Image,
  ) as CanvasImageElement
  expect(imageEl.width).toBe(300) // fixed
  expect(imageEl.height).toBe(600) // keep ratio
  expect(imageEl.x).toBe(-50) // centered
  expect(imageEl.y).toBe(-200) // centered
})
