import type {SetStoreFunction} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {
  isCanvas,
  isEditorElement,
  isFile,
  isLinkElement,
  type Openable,
  Page,
  type State,
} from '@/state'
import type {CanvasService} from './CanvasService'
import {FileService} from './FileService'
import type {MenuTreeItem, TreeService} from './TreeService'

interface DeleteResult {
  navigateTo?: Openable
}

export class DeleteService {
  constructor(
    private fileService: FileService,
    private canvasService: CanvasService,
    private treeService: TreeService,
    private store: State,
    private setState: SetStoreFunction<State>,
  ) {}

  async emptyBin(): Promise<DeleteResult> {
    let navigateTo: Openable | undefined

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

  async delete(node: MenuTreeItem, forever = false): Promise<DeleteResult> {
    const navigateTo = this.getNavigateTo(node)

    const proms = [this.deleteNode(node, forever)]
    this.treeService.descendants((n) => proms.push(this.deleteNode(n, forever)), node.id)
    await Promise.all(proms)

    return {navigateTo}
  }

  private getNavigateTo(node: MenuTreeItem): Openable | undefined {
    // Navigate to root if no parent
    if (node.parentId === undefined) {
      return '/'
    }

    const currentFile = this.fileService.currentFile

    // Navigate to parent of deleted node if current file is deleted
    // or if current file is an anchestor of deleted node
    if (
      this.store.lastLocation?.page !== Page.Canvas &&
      currentFile &&
      (node.id === currentFile.id || this.treeService.isDescendant(currentFile.id, node.id)) &&
      node.parentId !== undefined
    ) {
      return this.fileService.findFileById(node.parentId)
    }
  }

  private async deleteNode(node: MenuTreeItem, forever = false) {
    // delete forever if no subtree and not modified or forever=true
    if ((node.childrenIds.length === 0 && !node.value.lastModified) || forever) {
      await this.foreverDeleteNode(node)
      return
    }

    // soft delete file
    if (isFile(node.value)) {
      this.fileService.updateFile(node.id, {
        deleted: true,
        active: false,
        lastModified: new Date(),
      })

      const updatedFile = this.fileService.findFileById(node.id)
      if (!updatedFile) return

      await FileService.saveFile(updatedFile)
      info('File deleted')
    }

    // soft delete canvas
    if (isCanvas(node.value)) {
      const canvas = this.canvasService.findCanvas(node.id)
      if (!canvas) return

      this.canvasService.updateCanvas(canvas.id, {
        deleted: true,
        lastModified: new Date(),
      })

      const updated = this.canvasService.findCanvas(canvas.id)
      await this.canvasService.saveCanvas(updated)
      info('Set canvas as deleted')
    }
  }

  private async foreverDeleteNode(node: MenuTreeItem) {
    const id = node.id

    if (isFile(node.value)) {
      const files = this.store.files.filter((it) => it.id !== id)
      this.setState({files})

      for (const [canvasIndex, canvas] of this.store.canvases.entries()) {
        const elements = []
        let shouldUpdate = false
        for (const el of canvas.elements) {
          if (
            (isEditorElement(el) && el.id === id) ||
            (isLinkElement(el) && (el.to === id || el.from === id))
          ) {
            shouldUpdate = true
            continue
          }

          elements.push(el)
        }

        if (shouldUpdate) {
          this.setState('canvases', canvasIndex, 'elements', elements)
          const updated = this.canvasService.findCanvas(canvas.id)
          if (updated) await DB.updateCanvas(updated)
        }
      }

      await DB.deleteFile(id)
      info('File forever deleted')
    }
  }
}
