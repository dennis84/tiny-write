import {createDeepSignal} from '@solid-primitives/resource'
import {createResource} from 'solid-js'
import {produce} from 'solid-js/store'
import {v4 as uuid} from 'uuid'
import {DB} from '@/db'
import {listContents} from '@/remote/editor'
import {info} from '@/remote/log'
import {isDirectory} from '@/state'
import type {Directory, Filename, Project} from '@/types'
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
      type: 'project' as const,
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

  async toggleDirectory(item: Project | Directory) {
    const treeItem = this.treeService.getItem(item.id)
    if (!treeItem) return

    if (this.treeService.isCollapsed(item.id)) {
      await this.treeService.collapse(item.id)
    } else if (treeItem.childrenIds.length > 0) {
      await this.treeService.collapse(item.id)
      return
    }

    const projectId = isDirectory(item) ? item.projectId : item.id
    const path = isDirectory(item) ? item.path : item.worktreePath
    if (!path) return

    const dirEntries = await listContents(path)
    const treeItems = dirEntries.map(
      (dirEntry) =>
        ({
          type: dirEntry.isDirectory ? 'directory' : 'filename',
          path: dirEntry.path,
          id: dirEntry.name,
          projectId,
          name: dirEntry.name,
          parentId: item.id,
        }) satisfies Filename | Directory,
    )

    this.treeService.addAll(treeItems)
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
