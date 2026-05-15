import {isCanvas, isFile, isProject} from '@/state'
import type {MenuTreeItem} from '@/types'
import {CanvasService} from './CanvasService'
import {FileService} from './FileService'
import type {ProjectService} from './ProjectService'
import type {TreeService} from './TreeService'

export class TreeActionService {
  constructor(
    private treeService: TreeService,
    private fileService: FileService,
    private canvasService: CanvasService,
    private projectService: ProjectService,
  ) {}

  async move(id: string, toId: string) {
    const affected = this.treeService.move(id, toId)
    await this.updateItems(affected)
  }

  async before(id: string, toId: string) {
    const affected = this.treeService.before(id, toId)
    await this.updateItems(affected)
  }

  async after(id: string, toId: string) {
    const affected = this.treeService.after(id, toId)
    await this.updateItems(affected)
  }

  private async updateItems(items: MenuTreeItem[]) {
    if (items.length === 0) return

    const [target, ...rest] = items
    const curProjectId = 'projectId' in target.value ? target.value.projectId : undefined

    // Save projectId to all descendants if target was added to a project
    const project = this.treeService.getProjectItem(target.id)
    if (project && curProjectId !== project.id) {
      await this.updateItem(target, project.id)
      const descendants = this.treeService.getDescendants(target.id)
      for (const item of descendants) {
        await this.updateItem(item, project.id)
      }
    } else {
      await this.updateItem(target)
    }

    for (const item of rest) {
      await this.updateItem(item, project?.id)
    }
  }

  private async updateItem(item: MenuTreeItem, projectId?: string) {
    const {parentId, leftId} = item
    if (isFile(item.value)) {
      this.fileService.updateFile(item.id, {leftId, parentId, projectId})
      await FileService.saveFile({...item.value, leftId, parentId, projectId})
    } else if (isCanvas(item.value)) {
      this.canvasService.updateCanvas(item.id, {leftId, parentId, projectId})
      await CanvasService.saveCanvas({...item.value, leftId, parentId})
    } else if (isProject(item.value)) {
      await this.projectService.updateProject(item.id, {leftId})
    }
  }
}
