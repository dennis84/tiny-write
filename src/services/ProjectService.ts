import {createDeepSignal} from '@solid-primitives/resource'
import {createResource} from 'solid-js'
import {produce} from 'solid-js/store'
import {v4 as uuid} from 'uuid'
import {createCodeFence} from '@/components/assistant/util'
import {DB} from '@/db'
import {serialize} from '@/prosemirror/markdown-serialize'
import {listContents} from '@/remote/editor'
import {info} from '@/remote/log'
import {isDirectory, isFile, isFilename, isProjectItem} from '@/state'
import {
  AttachmentType,
  type Directory,
  type FileAttachment,
  type Filename,
  type Project,
  type ProjectAttachment,
  type TextAttachment,
} from '@/types'
import {YjsUtil} from '@/utils/YjsUtil'
import type {CanvasService} from './CanvasService'
import {FileService} from './FileService'
import type {TreeService} from './TreeService'

export class ProjectService {
  private projectsResource = createResource(() => DB.getProjects(), {
    storage: createDeepSignal,
  })

  constructor(
    private treeService: TreeService,
    private fileService: FileService,
    private canvasService: CanvasService,
  ) {}

  get currentProject(): Project | undefined {
    const currentFile = this.fileService.currentFile
    if (currentFile?.projectId) {
      return this.projects.find((p) => p.id === currentFile.projectId)
    }

    const currentId = currentFile?.id ?? this.canvasService.currentCanvas?.id
    if (!currentId) return undefined

    let project: Project | undefined
    this.treeService.ancestors((it) => {
      if (it.value.type === 'project') project = it.value
    }, currentId)

    return project
  }

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
      info(`Saving project (id=${id}, leftId=${updated.leftId})`)
      await DB.updateProject(updated)
    }
  }

  async toggleDirectory(item: Project | Directory) {
    const treeItem = this.treeService.getItem(item.id)
    if (!treeItem) return

    if (!isProjectItem(item)) {
      await this.treeService.collapse(item.id)
      return
    }

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
    const treeItems: (Filename | Directory)[] = []
    for (const dirEntry of dirEntries) {
      const id = FileService.createId(dirEntry.path)
      const cur = this.treeService.tree.getItem(id)
      let lastCursorPos: number | undefined

      if (isFile(cur?.value)) {
        // Skip existing files if initialized
        if (!YjsUtil.isEmpty(cur.value.ydoc)) continue
        lastCursorPos = cur.value.lastCursorPos
      }

      treeItems.push({
        type: dirEntry.isDirectory ? 'directory' : 'filename',
        id,
        path: dirEntry.path,
        projectId,
        name: dirEntry.name,
        parentId: item.id,
        lastCursorPos,
      })
    }

    this.treeService.addAll(treeItems)
  }

  async createAttachment(project: Project): Promise<ProjectAttachment> {
    const descendants = this.treeService.getDescendants(project.id)

    const files: (FileAttachment | TextAttachment)[] = []
    const MAX = 3
    let opened = 0
    let tree = ''

    for (const [it, level] of descendants) {
      const indent = '  '.repeat(level) + (level > 0 ? '├── ' : '')

      if (isFile(it.value) && it.value.code) {
        if (it.value.codeEditorView && opened < MAX) {
          const content = createCodeFence({
            id: it.value.id,
            code: it.value.codeEditorView.state.doc.toString(),
            lang: it.value.codeLang,
            path: it.value.path,
          })

          files.push({
            content,
            type: AttachmentType.File,
            codeLang: it.value.codeLang,
            fileId: it.value.id,
            parentId: it.parentId,
            leftId: it.leftId,
          })

          opened++
        }

        const name = await this.fileService.getTitle(it.value)
        tree += `${indent}${name}\n`
      } else if (isFile(it.value)) {
        if (it.value.editorView && opened < MAX) {
          const content = serialize(it.value.editorView.state)

          files.push({
            content,
            type: AttachmentType.Text,
            fileId: it.value.id,
            parentId: it.parentId,
            leftId: it.leftId,
          })

          opened++
        }

        const name = await this.fileService.getTitle(it.value)
        tree += `${indent}${name}\n`
      } else if (isFilename(it.value)) {
        tree += `${indent}${it.value.name}\n`
      } else if (isDirectory(it.value)) {
        tree += `${indent}${it.value.name}/\n`
      }
    }

    return {
      type: AttachmentType.Project,
      projectId: project.id,
      projectName: project.name,
      tree,
      files,
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
