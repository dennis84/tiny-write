import {waitFor} from '@solidjs/testing-library'
import {clearMocks, mockConvertFileSrc, mockWindows} from '@tauri-apps/api/mocks'
import {fromBase64} from 'js-base64'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DropTarget, MediaService} from '@/services/MediaService'
import {createState} from '@/state'
import {type CanvasEditorElement, type CanvasImageElement, ElementType} from '@/types'
import * as cmUtil from '../testutil/codemirror-util'
import * as pmUtil from '../testutil/prosemirror-util'
import {createIpcMock, renderMain, stubLocation} from '../testutil/util'

document.elementFromPoint = () => null

vi.stubGlobal('location', {
  pathname: '',
  reload: vi.fn(),
})

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  clearMocks()
  vi.resetAllMocks()
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

  const initial = createState({
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  const blob = new Blob(['123'], {type: 'image/jpeg'}) as File
  await ctrl.mediaService.dropFiles([blob], [0, 0])

  const doc = ctrl.fileService.currentFile?.editorView?.state.doc
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
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [editorElement],
      },
    ],
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = ctrl.canvasService.currentCanvas

  const blob = new Blob([], {type: 'image/png'}) as File
  await ctrl.mediaService.dropFiles([blob], [100, 100])

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
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [editorElement],
      },
    ],
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = ctrl.canvasService.currentCanvas
  const editorEl = currentCanvas?.elements[0] as CanvasEditorElement
  ctrl.canvasService.select('1', true)

  const blob = new Blob(['123'], {type: 'image/png'}) as File
  await ctrl.mediaService.dropFiles([blob], [0, 0])

  expect(currentCanvas?.elements).toHaveLength(1)

  const doc = ctrl.fileService.findFileById(editorEl.id)?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  const [, data] = image?.attrs.src.split('base64,') ?? []
  expect(fromBase64(data)).toBe('123')
})

test('dropFiles - image on assistant', async () => {
  stubLocation('/assistant/1')

  const initial = createState({
    threads: [{id: '1', messages: []}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('chat_scroll')).toBeDefined()
  })

  const files = [
    new Blob(['123'], {type: 'image/png'}) as File,
    new Blob(['456']) as File, // only images allowed
  ]
  await ctrl.mediaService.dropFiles(files, [0, 0])

  expect(ctrl.mediaService.droppedFiles()).toHaveLength(1)
  expect(ctrl.mediaService.droppedFiles()[0].type).toBe('image/png')
})

test('dropFiles - image on assistant drawer', async () => {
  stubLocation('/code/1')

  const initial = createState({
    files: [{id: '1', ydoc: cmUtil.createYUpdate('1', ''), versions: [], code: true}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  const files = [
    new Blob(['123'], {type: 'image/png'}) as File,
    new Blob(['456']) as File, // only images allowed
  ]
  await ctrl.mediaService.dropFiles(files, [0, 0], DropTarget.Assistant)

  expect(ctrl.mediaService.droppedFiles()).toHaveLength(1)
  expect(ctrl.mediaService.droppedFiles()[0].type).toBe('image/png')
})

test('dropPaths - image on editor', async () => {
  stubLocation('/editor/1')

  const initial = createState({
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await ctrl.mediaService.dropPaths(['/users/me/file.png'], [0, 0])

  const doc = ctrl.fileService.currentFile?.editorView?.state.doc
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
        ydoc: pmUtil.createYUpdate('1', []),
        path: '/users/me/project/README.md',
        lastModified,
        versions: [],
      },
    ],
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  await ctrl.mediaService.dropPaths(['/users/me/project/file.png'], [0, 0])

  const doc = ctrl.fileService.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('~/project/file.png')
})

test('dropPaths - text file on editor', async () => {
  stubLocation('/editor/1')

  const initial = createState({
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })

  expect(ctrl.store.files).toHaveLength(1)

  const path = '/users/me/project/README.md'
  const result = await ctrl.mediaService.dropPaths([path], [0, 0])

  expect(ctrl.store.files).toHaveLength(2)
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
    files: [{id: '1', ydoc: pmUtil.createYUpdate('1', []), versions: []}],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        elements: [editorElement],
      },
    ],
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  vi.spyOn(MediaService.prototype as any, 'loadImage').mockResolvedValue({
    width: 100,
    height: 200,
  } as HTMLImageElement)

  const currentCanvas = ctrl.canvasService.currentCanvas

  await ctrl.mediaService.dropPaths(['/users/me/file.png'], [100, 100])

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

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  const currentCanvas = ctrl.canvasService.currentCanvas

  const path = '/users/me/project/README.md'
  const result = await ctrl.mediaService.dropPaths([path], [0, 0])

  expect(result?.file).toBe(undefined)
  expect(ctrl.store.files).toHaveLength(1)

  expect(currentCanvas?.elements).toHaveLength(1)
  expect(ctrl.store.files[0].id).toBe(currentCanvas?.elements[0].id)
  expect(ctrl.store.files[0].path).toBe(path)
})

test('dropPaths - text file on code', async () => {
  stubLocation('/code/1')

  const initial = createState({
    files: [{id: '1', ydoc: cmUtil.createYUpdate('1', ''), versions: [], code: true}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.store.files).toHaveLength(1)

  const path = '/users/me/project/README.md'
  const result = await ctrl.mediaService.dropPaths([path], [0, 0])

  expect(result?.file).toBeDefined()
  expect(ctrl.store.files).toHaveLength(2)
})

test('dropPaths - image on code', async () => {
  stubLocation('/code/1')

  const initial = createState({
    files: [{id: '1', ydoc: cmUtil.createYUpdate('1', ''), versions: [], code: true}],
  })
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('code_scroll')).toBeDefined()
  })

  expect(ctrl.store.files).toHaveLength(1)

  const path = '/users/me/file.png'
  const result = await ctrl.mediaService.dropPaths([path], [0, 0])

  expect(result?.file).toBeDefined()
  expect(ctrl.store.files).toHaveLength(2)
  expect(ctrl.fileService.findFileById(result?.file?.id ?? '')?.path).toBe(path)
})
