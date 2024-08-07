import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {clearMocks, mockConvertFileSrc} from '@tauri-apps/api/mocks'
import {fromBase64} from 'js-base64'
import {MediaService} from '@/services/MediaService'
import {createCtrl, Ctrl} from '@/services'
import {CanvasEditorElement, CanvasImageElement, ElementType, Mode, createState} from '@/state'
import {createIpcMock, renderEditor} from '../util/util'
import {createYUpdate} from '../util/prosemirror-util'

document.elementFromPoint = () => null

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.stubGlobal('location', ({
  pathname: '',
  reload: vi.fn(),
}))

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  clearMocks()
  vi.clearAllMocks()
  mockConvertFileSrc('macos')
  createIpcMock()
})

vi.stubGlobal('__TAURI__', {})

const lastModified = new Date()

test('getImagePath', async () => {
  const ctrl = mockDeep<Ctrl>()
  const state = createState()
  const input = '/path/to/file.png'
  const service = new MediaService(ctrl, state)
  const path = await service.getImagePath(input)
  expect(path).toBe('asset://localhost/' + encodeURIComponent(input))

  const p2 = await service.getImagePath(input, '/base/path')
  expect(p2).toBe('asset://localhost/' + encodeURIComponent('/base/path' + input))
})

test('dropFile - image on editor', async () => {
  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

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
  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const {ctrl} = createCtrl(createState({
    mode: Mode.Canvas,
    files: [
      {id: '1', ydoc: createYUpdate('1', []), versions: []}
    ],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        active: true,
        elements: [editorElement],
      },
    ],
  }))

  vi.spyOn(MediaService.prototype as any, 'loadImage')
    .mockResolvedValue({width: 100, height: 200} as HTMLImageElement)

  const target = document.createElement('div')
  await ctrl.app.init()

  const currentCanvas = ctrl.canvas.currentCanvas
  await renderEditor('1', ctrl, target)

  const blob = new Blob([], {type: 'image/png'})
  await ctrl.media.dropFile(blob, [100, 100])

  expect(currentCanvas?.elements).toHaveLength(2)

  const imageEl = currentCanvas?.elements.find((it) => it.type === ElementType.Image) as CanvasImageElement
  expect(imageEl.width).toBe(300) // fixed
  expect(imageEl.height).toBe(600) // keep ratio
  expect(imageEl.x).toBe(-50) // centered
  expect(imageEl.y).toBe(-200) // centered
})

test('dropFile - image on canvas with active editor', async () => {
  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const {ctrl} = createCtrl(createState({
    mode: Mode.Canvas,
    files: [
      {id: '1', ydoc: createYUpdate('1', []), versions: []}
    ],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        active: true,
        elements: [editorElement],
      },
    ],
  }))

  vi.spyOn(MediaService.prototype as any, 'loadImage')
    .mockResolvedValue({width: 100, height: 200} as HTMLImageElement)

  const target = document.createElement('div')
  await ctrl.app.init()

  const currentCanvas = ctrl.canvas.currentCanvas
  const editorEl = currentCanvas?.elements[0] as CanvasEditorElement
  await renderEditor(editorEl.id, ctrl, target)
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
  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  await ctrl.media.dropPath('/users/me/file.png', [0, 0])

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('~/file.png')
})

test('dropPath - image on editor with basePath', async () => {
  const {ctrl} = createCtrl(createState({
    mode: Mode.Editor,
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', []),
        path: '/users/me/project/README.md',
        active: true,
        lastModified,
        versions: [],
      }
    ],
  }))

  const target = document.createElement('div')
  await ctrl.app.init()
  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  await ctrl.media.dropPath('/users/me/project/file.png', [0, 0])

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('./file.png')
})

test('dropPath - text file on editor', async () => {
  const {store, ctrl} = createCtrl(createState())

  const target = document.createElement('div')
  await ctrl.app.init()
  expect(store.files).toHaveLength(1)

  await renderEditor(ctrl.file.currentFile!.id, ctrl, target)

  const path = '/users/me/project/README.md'
  await ctrl.media.dropPath(path, [0, 0])

  expect(store.files).toHaveLength(2)

  const currentFile = ctrl.file.currentFile
  expect(currentFile?.path).toBe(path)
})

test('dropPath - image on canvas', async () => {
  const editorElement = {
    id: '1',
    type: ElementType.Editor,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const {ctrl} = createCtrl(createState({
    mode: Mode.Canvas,
    files: [
      {id: '1', ydoc: createYUpdate('1', []), versions: []}
    ],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        lastModified,
        active: true,
        elements: [editorElement],
      },
    ],
  }))

  vi.spyOn(MediaService.prototype as any, 'loadImage')
    .mockResolvedValue({width: 100, height: 200} as HTMLImageElement)

  const target = document.createElement('div')
  await ctrl.app.init()

  const currentCanvas = ctrl.canvas.currentCanvas
  const editorEl = currentCanvas?.elements[0] as CanvasEditorElement
  await renderEditor(editorEl.id, ctrl, target)

  await ctrl.media.dropPath('/users/me/file.png', [100, 100])

  expect(currentCanvas?.elements).toHaveLength(2)

  const imageEl = currentCanvas?.elements.find((it) => it.type === ElementType.Image) as CanvasImageElement
  expect(imageEl.width).toBe(300) // fixed
  expect(imageEl.height).toBe(600) // keep ratio
  expect(imageEl.x).toBe(-50) // centered
  expect(imageEl.y).toBe(-200) // centered
})
