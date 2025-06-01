import {vi, expect, test, beforeEach} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {clearMocks} from '@tauri-apps/api/mocks'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {ElementType, Page, createState} from '@/state'
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
  {page: Page.Editor, expected: '/users/me/cwd'},
  {page: Page.Code, worktreePath: '/users/me/project', expected: '/users/me/project'},
  {page: Page.Code, expected: '/users/me/cwd'},
  {page: Page.Canvas, active: true, expected: '/users/me/cwd'},
  {page: Page.Canvas, active: false, expected: '/users/me/cwd'},
])('getBasePath - from file', async (data) => {
  createIpcMock({
    get_document: () => ({
      worktreePath: data.worktreePath,
    }),
  })

  const canvasEditor = {
    id: '1',
    type: ElementType.Editor,
    active: data.active,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }

  const state = createState({
    args: {cwd: '/users/me/cwd'},
    lastLocation: {
      path: `/${data.page}/1`,
      page: data.page,
      fileId: '1',
    },
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Test']),
        lastModified,
        versions: [],
        path: '/users/me/project/file1',
      },
    ],
    canvases: [
      {
        id: '1',
        camera: {point: [0, 0], zoom: 1},
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
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', ['Test']),
        lastModified,
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
