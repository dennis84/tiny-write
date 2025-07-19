import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks, mockConvertFileSrc, mockWindows} from '@tauri-apps/api/mocks'
import {fromBase64} from 'js-base64'
import {render, waitFor} from '@solidjs/testing-library'
import {DropTarget, MediaService} from '@/services/MediaService'
import {createCtrl} from '@/services'
import {type CanvasEditorElement, type CanvasImageElement, ElementType, createState} from '@/state'
import {Main} from '@/components/Main'
import {createIpcMock, stubLocation} from '../util/util'
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
  expect(path).toBe(`asset://localhost/${encodeURIComponent(input)}`)

  const p2 = await MediaService.getImagePath(input, '/base/path')
  expect(p2).toBe(`asset://localhost/${encodeURIComponent(`/base/path${input}`)}`)
})

test('dropFiles - image on editor', async () => {
  stubLocation('/editor/1')

  const initial = createState()
  const {store, fileService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  const blob = new Blob(['123']) as File
  await mediaService.dropFiles([blob], [0, 0])

  const doc = fileService.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  const [, data] = image?.attrs.src.split('base64,') ?? []
  expect(fromBase64(data)).toBe('123')
})

test('dropFiles - image on canvas', async () => {
  stubLocation('/canvas/1')

  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const initial = createState({
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [editorElement],
      },
    ],
  })

  const {store, canvasService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = canvasService.currentCanvas

  const blob = new Blob([], {type: 'image/png'}) as File
  await mediaService.dropFiles([blob], [100, 100])

  expect(currentCanvas?.elements).toHaveLength(2)

  const imageEl = currentCanvas?.elements.find(
    (it) => it.type === ElementType.Image,
  ) as CanvasImageElement
  expect(imageEl.width).toBe(300) // fixed
  expect(imageEl.height).toBe(600) // keep ratio
  expect(imageEl.x).toBe(-50) // centered
  expect(imageEl.y).toBe(-200) // centered
})

test('dropFiles - image on canvas with active editor', async () => {
  stubLocation('/canvas/1')

  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const initial = createState({
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [editorElement],
      },
    ],
  })

  const {store, canvasService, fileService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = canvasService.currentCanvas
  const editorEl = currentCanvas?.elements[0] as CanvasEditorElement
  canvasService.select('1', true)

  const blob = new Blob(['123'], {type: 'image/png'}) as File
  await mediaService.dropFiles([blob], [0, 0])

  expect(currentCanvas?.elements).toHaveLength(1)

  const doc = fileService.findFileById(editorEl.id)?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  const [, data] = image?.attrs.src.split('base64,') ?? []
  expect(fromBase64(data)).toBe('123')
})

test('dropFiles - image on assistant', async () => {
  stubLocation('/assistant/1')

  const initial = createState()
  const {store, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('assistant')).toBeDefined()
  })

  const files = [
    new Blob(['123'], {type: 'image/png'}) as File,
    new Blob(['456']) as File, // only images allowed
  ]
  await mediaService.dropFiles(files, [0, 0])

  expect(mediaService.droppedFiles()).toHaveLength(1)
  expect(mediaService.droppedFiles()[0].type).toBe('image/png')
})

test('dropFiles - image on assistant drawer', async () => {
  stubLocation('/code/1')

  const initial = createState()
  const {store, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  const files = [
    new Blob(['123'], {type: 'image/png'}) as File,
    new Blob(['456']) as File, // only images allowed
  ]
  await mediaService.dropFiles(files, [0, 0], DropTarget.Assistant)

  expect(mediaService.droppedFiles()).toHaveLength(1)
  expect(mediaService.droppedFiles()[0].type).toBe('image/png')
})

test('dropPaths - image on editor', async () => {
  stubLocation('/editor/1')

  const initial = createState()
  const {store, fileService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await mediaService.dropPaths(['/users/me/file.png'], [0, 0])

  const doc = fileService.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('~/file.png')
})

test('dropPaths - image on editor with basePath', async () => {
  stubLocation('/editor/1')

  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', []),
        path: '/users/me/project/README.md',
        lastModified,
        versions: [],
      },
    ],
  })

  const {store, mediaService, fileService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await mediaService.dropPaths(['/users/me/project/file.png'], [0, 0])

  const doc = fileService.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('~/project/file.png')
})

test('dropPaths - text file on editor', async () => {
  stubLocation('/editor/1')

  const initial = createState()
  const {store, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(store.files).toHaveLength(1)

  const path = '/users/me/project/README.md'
  const result = await mediaService.dropPaths([path], [0, 0])

  expect(store.files).toHaveLength(2)
  expect(result?.file?.path).toBe(path)
})

test('dropPaths - image on canvas', async () => {
  stubLocation('/canvas/1')

  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const initial = createState({
    files: [{id: '1', ydoc: createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [editorElement],
      },
    ],
  })

  const {store, canvasService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = canvasService.currentCanvas

  await mediaService.dropPaths(['/users/me/file.png'], [100, 100])

  expect(currentCanvas?.elements).toHaveLength(2)

  const imageEl = currentCanvas?.elements.find(
    (it) => it.type === ElementType.Image,
  ) as CanvasImageElement
  expect(imageEl.width).toBe(300) // fixed
  expect(imageEl.height).toBe(600) // keep ratio
  expect(imageEl.x).toBe(-50) // centered
  expect(imageEl.y).toBe(-200) // centered
})

test('dropPaths - text file on canvas', async () => {
  stubLocation('/canvas/1')

  const initial = createState({
    files: [],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [],
      },
    ],
  })

  const {store, canvasService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  const currentCanvas = canvasService.currentCanvas

  const path = '/users/me/project/README.md'
  const result = await mediaService.dropPaths([path], [0, 0])

  expect(result?.file).toBe(undefined)
  expect(store.files).toHaveLength(1)

  expect(currentCanvas?.elements).toHaveLength(1)
  expect(store.files[0].id).toBe(currentCanvas?.elements[0].id)
  expect(store.files[0].path).toBe(path)
})

test('dropPaths - text file on code', async () => {
  stubLocation('/code/1')

  const initial = createState()
  const {store, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.files).toHaveLength(1)

  const path = '/users/me/project/README.md'
  const result = await mediaService.dropPaths([path], [0, 0])

  expect(result?.file).toBeDefined()
  expect(store.files).toHaveLength(2)
})

test('dropPaths - image on code', async () => {
  stubLocation('/code/1')

  const initial = createState()
  const {store, fileService, mediaService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(store.files).toHaveLength(1)

  const path = '/users/me/file.png'
  const result = await mediaService.dropPaths([path], [0, 0])

  expect(result?.file).toBeDefined()
  expect(store.files).toHaveLength(2)
  expect(fileService.findFileById(result?.file?.id)?.path).toBe(path)
})
