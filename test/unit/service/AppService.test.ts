import {clearMocks} from '@tauri-apps/api/mocks'
import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import * as remoteEditor from '@/remote/editor'
import {AppService} from '@/services/AppService'
import type {FileService} from '@/services/FileService'
import {createState} from '@/state'

vi.mock('@/db', () => ({
  DB: mock({
    getFiles: vi.fn(),
    getCanvases: vi.fn(),
  }),
}))

vi.mock('@/remote/editor', () => ({
  getDocument: vi.fn(),
}))

const lastModified = new Date()

beforeEach(() => {
  clearMocks()
})

test.each([
  {expected: '/users/me/cwd'},
  {code: true, worktreePath: '/users/me/project', expected: '/users/me/project'},
  {code: true, expected: '/users/me/cwd'},
])('getBasePath - from file', async (data) => {
  const file = {
    id: '1',
    ydoc: new Uint8Array(),
    lastModified,
    versions: [],
    path: '/users/me/project/file1',
    code: data.code,
  }

  const fileService = mock<FileService>({currentFile: undefined})
  const [store, setStore] = createStore(createState({args: {cwd: '/users/me/cwd'}}))
  const service = new AppService(fileService, store, setStore)

  vi.spyOn(fileService, 'currentFile', 'get').mockReturnValue(file)
  vi.spyOn(remoteEditor, 'getDocument').mockResolvedValue({
    worktreePath: data.worktreePath,
    path: `${data.worktreePath}/file.md`,
    lastModified: new Date(),
    version: 1,
  })

  const result = await service.getBasePath()
  expect(result).toEqual(data.expected)
})

test('reset', async () => {
  const fileService = mock<FileService>({currentFile: undefined})
  const [store, setStore] = createStore(createState({args: {cwd: '/users/me/cwd'}}))
  const service = new AppService(fileService, store, setStore)
  await service.reset()

  expect(DB.deleteDatabase).toHaveBeenCalled()
})
