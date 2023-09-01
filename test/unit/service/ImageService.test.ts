import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {clearMocks, mockIPC} from '@tauri-apps/api/mocks'
import {ImageService} from '@/services/ImageService'
import {createCtrl, Ctrl} from '@/services'
import {createState} from '@/state'
import {DB} from '@/db'
import {createYUpdateAsString, getText} from '../util'

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
  mockIPC((cmd, args: any) => {
    if (cmd === 'dirname') {
      return args.path
    }
    if (cmd === 'resolve_path') {
      return args.paths.join('')
    }
  })
})

vi.stubGlobal('__TAURI__', {})

const ctrl = mockDeep<Ctrl>()

test('getImagePath', async () => {
  const input = '/path/to/file.png'
  const service = new ImageService(ctrl)
  const path = await service.getImagePath(input)
  expect(path).toBe('asset://localhost/' + encodeURIComponent(input))

  const p2 = await service.getImagePath(input, '/base/path')
  expect(p2).toBe('asset://localhost/' + encodeURIComponent('/base/path' + input))
})

test('insert - image', async () => {
  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  ctrl.image.insert('123', 0, 0)

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('image')
  expect(image?.attrs.src).toBe('123')
})

test('insert - video', async () => {
  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  ctrl.image.insert('123', 0, 0, 'video/mp4')

  const doc = ctrl.file.currentFile?.editorView?.state.doc
  const paragraph = doc?.firstChild
  const image = paragraph?.firstChild
  expect(image?.type.name).toBe('video')
  expect(image?.attrs.src).toBe('123')
})

test('insert - markdown mode', async () => {
  const lastModified = new Date()

  vi.mocked(DB.getFiles).mockResolvedValue([
    {
      id: '1',
      ydoc: createYUpdateAsString('1', ''),
      active: true,
      markdown: true,
      lastModified,
    },
  ])

  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init()
  ctrl.editor.renderEditor(target)

  ctrl.image.insert('123', 0, 0)

  expect(getText(ctrl)).toBe('![](123)')
})
