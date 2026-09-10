import {info} from '@/remote/log'
import {isCanvas, isDeletable, isFile, isProject, isThread} from '@/state'
import type {Canvas, File, MenuTreeItem} from '@/types'
import type {CanvasService} from './CanvasService'
import type {FileService} from './FileService'
import type {LocationService, OpenItem} from './LocationService'
import type {ProjectService} from './ProjectService'
import type {ThreadService} from './ThreadService'
import type {TreeService} from './TreeService'

// File: /editor/:id or /code/:id
// Canvas: /canvas/:id
// false: stay on current page
// undefined: go to /
type NavigateTo = OpenItem | false | undefined

interface DeleteResult {
  navigateTo: NavigateTo
}

export class DeleteService {
  constructor(
    private fileService: FileService,
    private canvasService: CanvasService,
    private threadService: ThreadService,
    private projectService: ProjectService,
    private locationService: LocationService,
    private treeService: TreeService,
  ) {}

  async emptyBin(): Promise<DeleteResult> {
    let navigateTo: NavigateTo

    const doEmptyBin = async (node: MenuTreeItem): Promise<boolean> => {
      // dont delete if a child exists that don't have the deleted flag
      let shouldDelete = (isDeletable(node.value) && node.value.deleted) ?? false

      for (const n of node.childrenIds) {
        const item = this.treeService.getItem(n)
        if (!item) continue
        const shouldDeleteChild = await doEmptyBin(item)
        if (!shouldDeleteChild) shouldDelete = false
      }

      if (shouldDelete) {
        if (this.locationService.currentItemId === node.id) {
          navigateTo = this.getNavigateTo(node)
        }

        await this.foreverDeleteNode(node)
      }

      return shouldDelete
    }

    for (const rootId of Object.values(this.treeService.tree.rootItemIds)) {
      const item = this.treeService.getItem(rootId)
      if (item) await doEmptyBin(item)
    }

    return {navigateTo}
  }

  async deleteItem(item: File | Canvas, forever = false): Promise<DeleteResult> {
    const node = this.treeService.getItem(item.id)
    if (!node) return {navigateTo: false}
    return this.delete(node, forever)
  }

  async delete(node: MenuTreeItem, forever = false): Promise<DeleteResult> {
    const navigateTo = this.getNavigateTo(node)

    const proms = [this.deleteNode(node, forever)]
    this.treeService.descendants((n) => proms.push(this.deleteNode(n, forever)), node.id)
    await Promise.all(proms)

    return {navigateTo}
  }

  private getNavigateTo(node: MenuTreeItem): NavigateTo {
    const currentItemId = this.locationService.currentItemId

    if (
      !currentItemId ||
      (currentItemId !== node.id && !this.treeService.isDescendant(currentItemId, node.id))
    ) {
      return false
    }

    if (node.parentId) {
      const item = this.treeService.getItem(node.parentId)?.value
      return isFile(item) || isCanvas(item) || isThread(item) || isProject(item) ? item : undefined
    }
  }

  private async deleteNode(node: MenuTreeItem, forever = false) {
    const deleteForever =
      forever ||
      (node.childrenIds.length === 0 && !node.value.lastModified) ||
      (isFile(node.value) && node.value.path) ||
      (isFile(node.value) && node.value.newFile) ||
      (isProject(node.value) && node.value.worktreePath)

    // delete forever if no subtree and not modified or forever=true
    if (deleteForever) {
      await this.foreverDeleteNode(node)
    } else if (isFile(node.value)) {
      await this.fileService.deleteFile(node.id)
      info('File deleted')
    } else if (isCanvas(node.value)) {
      await this.canvasService.delete(node.id)
      info('Set canvas as deleted')
    }

    this.treeService.remove(node.id)
  }

  private async foreverDeleteNode(node: MenuTreeItem) {
    const id = node.id

    if (isFile(node.value)) {
      await this.fileService.deleteFile(id, true)
      // Remove file elements on canvases
      await this.canvasService.removeElementFromAll(id)
      info('File forever deleted')
    } else if (isCanvas(node.value)) {
      await this.canvasService.delete(id, true)
      info('Canvas forever deleted')
    } else if (isThread(node.value)) {
      await this.threadService.delete(id, true)
      info('Thread forever deleted')
    } else if (isProject(node.value)) {
      await this.projectService.delete(id, true)
      info('Project forever deleted')
    }
  }
}
