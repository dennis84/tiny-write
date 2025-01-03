import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {ElementType, Mode, createState} from '@/state'
import {createIpcMock} from '../util/util'
import {createYUpdate} from '../util/prosemirror-util'

vi.stubGlobal('__TAURI__', {})

vi.mock('@/db', () => ({DB: mock<DB>()}))

const lastModified = new Date()

beforeEach(() => {
  clearMocks()
  createIpcMock()
})

test.each([
  {fileActive: true, expected: '/users/me/cwd'},
  {fileActive: true, worktreePath: '/users/me/project', expected: '/users/me/project'},
  {fileActive: false, expected: '/users/me/cwd'},
  {fileActive: true, mode: Mode.Canvas, expected: '/users/me/cwd'},
  {fileActive: false, mode: Mode.Canvas, expected: '/users/me/cwd'},
])('getBasePath - from file', async (data) => {
  createIpcMock({
    get_document: () => ({
      worktreePath: data.worktreePath,
    }),
  })

  const canvasEditor = {
    id: '1',
    type: ElementType.Editor,
    active: data.fileActive && data.mode === Mode.Canvas,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const state = createState({
    args: {cwd: '/users/me/cwd'},
    mode: data.mode ?? Mode.Editor,
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Test']),
        lastModified,
        active: data.fileActive ?? false,
        versions: [],
        path: '/users/me/project/file1',
      },
    ],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
        active: true,
        elements: [canvasEditor],
      },
    ],
  })

  const {appService} = createCtrl(state)
  const basePath = await appService.getBasePath()
  expect(basePath).toBe(data.expected)
})

test('reset', async () => {
  const initial = createState({
    args: {cwd: '/home', file: 'test.md'},
    mode: Mode.Editor,
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Test']),
        lastModified,
        active: true,
        versions: [],
      },
    ],
  })
  const {store, appService} = createCtrl(initial)

  await appService.reset()

  expect(store.files).toHaveLength(0)
  expect(store.args?.cwd).toBe('/home')
  expect(store.args?.file).toBe(undefined)

  expect(DB.deleteDatabase).toHaveBeenCalled()
})
