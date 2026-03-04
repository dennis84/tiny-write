import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {createState} from '@/state'
import {ElementType, Page} from '@/types'
import {createYUpdate} from '../testutil/prosemirror-util'
import {createIpcMock, renderMain} from '../testutil/util'

vi.stubGlobal('__TAURI__', {})

vi.mock('@/db', () => ({DB: mock<DB>()}))

const lastModified = new Date()

beforeEach(() => {
  clearMocks()
  createIpcMock()
  mockWindows('main')
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
      pathname: `${data.page}/1`,
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

  const {ctrl} = renderMain(state)
  const basePath = await ctrl.appService.getBasePath()
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
  const {ctrl} = renderMain(initial)

  await ctrl.appService.reset()

  expect(DB.deleteDatabase).toHaveBeenCalled()
})
