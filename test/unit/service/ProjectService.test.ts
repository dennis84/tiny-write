import {waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import {ProjectService} from '@/services/ProjectService'
import {TreeService} from '@/services/TreeService'

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/db', () => ({
  DB: mock({
    getProjects: vi.fn(),
  }),
}))

test('newProject', async () => {
  vi.spyOn(DB, 'getProjects').mockResolvedValue([{id: 'project_1', name: 'Project 1'}])

  const treeService = new TreeService()
  const service = new ProjectService(treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.newProject()

  expect(service.projects).toHaveLength(2)

  expect(DB.updateProject).toHaveBeenCalled()
})

test('updateProject', async () => {
  vi.spyOn(DB, 'getProjects').mockResolvedValue([{id: 'project_1', name: 'Project 1'}])

  const treeService = new TreeService()
  const service = new ProjectService(treeService)

  await waitFor(() => {
    expect(service.resourceState).toEqual('ready')
  })

  await service.updateProject('project_1', {name: 'Updated'})

  expect(service.projects[0].name).toEqual('Updated')

  expect(DB.updateProject).toHaveBeenCalled()
})
