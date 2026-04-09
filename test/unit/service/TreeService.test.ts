import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {TreeService} from '@/services/TreeService'
import {createCanvas, createFile} from '../testutil/data'
import {expectTree} from '../testutil/tree'

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/db', () => ({
  DB: mock({
    setTree: vi.fn(),
  }),
}))

test('reset', () => {
  const service = new TreeService()

  service.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2'}),
    createFile({id: 'file_3'}),
    createFile({id: 'file_4'}),
    createCanvas({id: 'canvas_5'}),
    {type: 'project', id: 'project_1', name: 'Project 1'},
  ])

  expectTree(
    service.tree,
    `
    └ file_1 (parentId=, leftId=)
    └ file_2 (parentId=, leftId=)
    └ file_3 (parentId=, leftId=)
    └ file_4 (parentId=, leftId=)
    └ canvas_5 (parentId=, leftId=)
    └ project_1 (parentId=, leftId=)
    `,
  )
})

test('collapse', async () => {
  const service = new TreeService()

  service.reset([
    createFile({id: 'file_1'}), // 1
    createFile({id: 'file_2', parentId: 'file_1'}),
  ])

  expectTree(
    service.tree,
    `
    └ file_1 (parentId=, leftId=)
      └ file_2 (parentId=file_1, leftId=)
    `,
  )

  await service.collapse('file_1')

  expect(DB.setTree).toHaveBeenCalledWith({collapsed: ['file_1']})
  expect(service.isCollapsed('file_1')).toBe(true)

  await service.collapse('file_1')

  expect(DB.setTree).toHaveBeenCalledWith({collapsed: []})
  expect(service.isCollapsed('file_1')).toBe(false)
})

test('isMoveAllowed', async () => {
  const service = new TreeService()

  service.reset([
    createFile({id: 'file_1'}),
    createFile({id: 'file_2', parentId: 'file_1'}),
    createFile({id: 'file_3'}),
    {type: 'project', id: 'project_1', name: 'Project 1'},
  ])

  expect(service.isMoveAllowed('file_3', 'file_2')).toBeTruthy()
  expect(service.isMoveAllowed('file_1', 'project_1')).toBeTruthy()
  expect(service.isMoveAllowed('file_1', 'file_2')).toBeFalsy()
  expect(service.isMoveAllowed('file_1', undefined)).toBeFalsy()
  expect(service.isMoveAllowed('file_1', 'file_1')).toBeFalsy()
  expect(service.isMoveAllowed('project_1', 'file_2')).toBeFalsy()
})
