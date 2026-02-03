import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {CanvasService} from '@/services/CanvasService'
import {CanvasThreadService} from '@/services/CanvasThreadService'
import type {FileService} from '@/services/FileService'
import {type Canvas, type CanvasElement, type CanvasLinkElement, ElementType} from '@/types'
import {createYUpdate} from '../testutil/prosemirror-util'

vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  vi.resetAllMocks()
})

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: 'c1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  lastModified: new Date(),
  ...props,
})

const createElement = (props: Partial<CanvasElement | CanvasLinkElement>) => ({
  id: '1',
  type: ElementType.Editor,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...props,
})

test('getMessages', () => {
  const canvasService = mock<CanvasService>()
  const fileService = mock<FileService>()

  // F2 -> F1 -> *AI*
  const canvas = createCanvas({
    elements: [
      createElement({id: '1'}),
      createElement({id: 'l1', to: '1', from: '2', type: ElementType.Link}),
      createElement({id: '2', type: ElementType.Code}),
    ],
  })

  Object.defineProperty(canvasService, 'currentCanvas', {get: vi.fn().mockReturnValue(canvas)})

  fileService.findFileById.calledWith('1').mockReturnValue({
    id: '1',
    ydoc: createYUpdate('1', []),
    versions: [],
    editorView: {state: {doc: {textContent: 'F1'}}} as any,
  })

  fileService.findFileById.calledWith('2').mockReturnValue({
    id: '1',
    ydoc: createYUpdate('1', []),
    versions: [],
    codeEditorView: {state: {doc: {toString: () => 'F2'}}} as any,
  })

  const service = new CanvasThreadService(canvasService, fileService)

  const messages = service.getMessages('1')

  expect(messages[0].role).toEqual('system') // prompt
  expect(messages[1].content[0]).toEqual({type: 'text', text: 'F2'})
  expect(messages[2].content[0]).toEqual({type: 'text', text: 'F1'})
})
