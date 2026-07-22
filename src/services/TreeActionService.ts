import {isCanvas, isFile, isProject, isThread} from '@/state'
import type {MenuTreeItem} from '@/types'
import {CanvasService} from './CanvasService'
import {FileService} from './FileService'
import type {ProjectService} from './ProjectService'
import type {ThreadService} from './ThreadService'
import type {TreeService} from './TreeService'

export class TreeActionService {
  constructor(
    private treeService: TreeService,
    private fileService: FileService,
    private canvasService: CanvasService,
    private projectService: ProjectService,
    private threadService: ThreadService,
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
    const projectId = project?.id
    if (project && curProjectId !== projectId) {
      await this.updateItem(target, {projectId})
      const descendants = this.treeService.getDescendants(target.id)
      for (const [item] of descendants) {
        await this.updateItem(item, {projectId})
      }
    } else {
      await this.updateItem(target)
    }

    for (const item of rest) {
      await this.updateItem(item)
    }
  }

  private async updateItem(item: MenuTreeItem, props?: {projectId?: string}) {
    // props: property must be missing to ignore update instead of key: undefined
    const {id, parentId, leftId} = item
    if (isFile(item.value)) {
      this.fileService.updateFile(id, {leftId, parentId, ...props})
      await FileService.saveFile({...item.value, leftId, parentId, ...props})
    } else if (isCanvas(item.value)) {
      this.canvasService.updateCanvas(id, {leftId, parentId, ...props})
      await CanvasService.saveCanvas({...item.value, leftId, parentId})
    } else if (isProject(item.value)) {
      await this.projectService.updateProject(id, {leftId})
    } else if (isThread(item.value)) {
      await this.threadService.updateTree(id, {parentId, leftId, ...props})
    }
  }
}
