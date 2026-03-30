import {createDeepSignal} from '@solid-primitives/resource'
import {createResource} from 'solid-js'
import {produce} from 'solid-js/store'
import {v4 as uuid} from 'uuid'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {Project} from '@/types'
import type {TreeService} from './TreeService'

export class ProjectService {
  private projectsResource = createResource(() => DB.getProjects(), {
    storage: createDeepSignal,
  })

  constructor(private treeService: TreeService) {}

  get projects() {
    return this.projectsResource[0].latest ?? []
  }

  get resourceState() {
    return this.projectsResource[0].state
  }

  async newProject(props: Partial<Project> = {}) {
    const existing = props.worktreePath
      ? this.projects.find((p) => p.worktreePath === props.worktreePath)
      : undefined
    if (existing) {
      info(`Project with given worktreePath already exists (worktreePath=${props.worktreePath})`)
      return existing
    }

    const project = {
      id: props.id ?? uuid(),
      name: props.name ?? 'New Project',
      ...props,
    }

    const [, {mutate}] = this.projectsResource
    mutate(
      produce((prev = []) => {
        prev.push(project)
      }),
    )

    this.treeService.add(this.projects[this.projects.length - 1])

    await DB.updateProject(project)
    info(`New project created (project=${JSON.stringify(project)})`)

    return this.projects[this.projects.length - 1]
  }

  async updateProject(id: string, update: Partial<Omit<Project, 'id'>>) {
    const updated = this.mutateProject((project) => {
      Object.assign(project, update)
    }, id)

    if (updated) {
      info(`Saving project (id=${id}, leftId=${updated.leftId}`)
      await DB.updateProject(updated)
    }
  }

  private mutateProject(fn: (project: Project) => void, projectId: string): Project | undefined {
    if (!projectId) return
    const [, {mutate}] = this.projectsResource
    let updated: Project | undefined
    mutate(
      produce((prev = []) => {
        updated = prev.find((thread) => thread.id === projectId)
        if (updated) fn(updated)
      }),
    )

    return updated
  }
}
