import {info} from '@/remote/log'
import {isCanvas, isFile} from '@/state'
import type {Canvas, File} from '@/types'
import type {CanvasService} from './CanvasService'
import type {FileService} from './FileService'
import type {MenuTreeItem, TreeService} from './TreeService'

// File: /editor/:id or /code/:id
// Canvas: /canvas/:id
// false: stay on current page
// undefined: go to /
type NavigateTo = File | Canvas | false | undefined

interface DeleteResult {
  navigateTo: NavigateTo
}

export class DeleteService {
  constructor(
    private fileService: FileService,
    private canvasService: CanvasService,
    private treeService: TreeService,
  ) {}

  async emptyBin(): Promise<DeleteResult> {
    let navigateTo: NavigateTo

    const doEmptyBin = async (node: MenuTreeItem): Promise<boolean> => {
      let shouldDelete = node.value.deleted ?? false

      for (const n of node.childrenIds) {
        const item = this.treeService.getItem(n)
        if (!item) continue
        const shouldDeleteChild = await doEmptyBin(item)
        if (!shouldDeleteChild) shouldDelete = false
      }

      if (shouldDelete) {
        if (this.fileService.currentFile?.id === node.id) {
          navigateTo = this.getNavigateTo(node)
        }

        await this.foreverDeleteNode(node)
      }

      return shouldDelete
    }

    for (const n of Object.values(this.treeService.tree.items)) {
      await doEmptyBin(n)
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
    const currentFile = this.fileService.currentFile
    const currentCanvas = this.canvasService.currentCanvas

    const findFileOrCanvas = (id: string) =>
      this.fileService.findFileById(id) || this.canvasService.findCanvas(id)

    const handle = (id?: string) => {
      // If current of acestor node is deleted
      if (id && (id === node.id || this.treeService.isDescendant(id, node.id))) {
        // Navigate to parent if exists
        if (node.parentId) return findFileOrCanvas(node.parentId)

        // Find previous or next node in root items:
        // 1 - skip deleted
        // 2 - cur
        // 3 - use as targetId
        let targetId: string | undefined
        let passedNode = false
        for (const rootId of this.treeService.tree.rootItemIds) {
          const rootNode = this.treeService.getItem(rootId)
          // Skip deleted nodes
          if (rootNode?.value.deleted) continue
          // Maybe exist loop if a targetId was found
          if (rootId === node.id) {
            passedNode = true
            if (targetId) break
          } else {
            targetId = rootId
          }

          // Exit on first found targetId after passedNode
          if (passedNode && targetId) {
            break
          }
        }

        if (targetId) return findFileOrCanvas(targetId)

        // Navigate to /
        return undefined
      }

      return false
    }

    const fileResult = handle(currentFile?.id)
    if (fileResult !== false) return fileResult

    return handle(currentCanvas?.id)
  }

  private async deleteNode(node: MenuTreeItem, forever = false) {
    // delete forever if no subtree and not modified or forever=true
    if ((node.childrenIds.length === 0 && !node.value.lastModified) || forever) {
      await this.foreverDeleteNode(node)
      this.treeService.remove(node.id)
      return
    }

    // soft delete file
    if (isFile(node.value)) {
      // No soft deletes for local files and files that wanted to be saved locally
      if (node.value.path || node.value.newFile) {
        return await this.foreverDeleteNode(node)
      }

      await this.fileService.deleteFile(node.id)
      info('File deleted')
    } else if (isCanvas(node.value)) {
      // soft delete canvas
      const canvas = this.canvasService.findCanvas(node.id)
      if (!canvas) return

      await this.canvasService.delete(canvas.id)
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
    }
  }
}
