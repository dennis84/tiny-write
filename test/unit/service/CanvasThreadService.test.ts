import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {CanvasService} from '@/services/CanvasService'
import {CanvasThreadService} from '@/services/CanvasThreadService'
import type {FileService} from '@/services/FileService'
import {ElementType} from '@/types'
import {createCanvas, createEditorElement, createLinkElement} from '../testutil/data'
import {createYUpdate} from '../testutil/prosemirror-util'

vi.mock('@/db', () => ({DB: mock()}))

vi.mock('@/prompts/common/user-message.md?raw', () => {
  return {default: 'Message: {{message}}'}
})

beforeEach(() => {
  vi.resetAllMocks()
})

test('getMessages', () => {
  const canvasService = mock<CanvasService>({currentCanvas: undefined})
  const fileService = mock<FileService>()

  // F2 -> F1 -> *AI*
  const canvas = createCanvas({
    elements: [
      createEditorElement({id: '1'}),
      createLinkElement({id: 'l1', to: '1', from: '2', type: ElementType.Link}),
      createEditorElement({id: '2', type: ElementType.Code}),
    ],
  })

  vi.spyOn(canvasService, 'currentCanvas', 'get').mockReturnValue(canvas)

  fileService.findFileById.calledWith('1').mockReturnValue({
    type: 'file',
    id: '1',
    ydoc: createYUpdate('1', []),
    versions: [],
    editorView: {state: {doc: {textContent: 'F1'}}} as any,
  })

  fileService.findFileById.calledWith('2').mockReturnValue({
    type: 'file',
    id: '1',
    ydoc: createYUpdate('1', []),
    versions: [],
    codeEditorView: {state: {doc: {toString: () => 'F2'}}} as any,
  })

  const service = new CanvasThreadService(canvasService, fileService)

  const messages = service.getMessages('1')

  expect(messages[0].role).toEqual('system') // common prompt
  expect(messages[1].role).toEqual('system') // canvas rules prompt
  expect(messages[2].content[0]).toEqual({type: 'text', text: 'F2'})
  expect(messages[3].content[0]).toEqual({type: 'text', text: 'Message: F1'})
})
