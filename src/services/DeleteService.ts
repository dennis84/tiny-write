import {isCanvas, isEditorElement, isFile, isLinkElement, Mode, Openable, State} from '@/state'
import {CanvasService} from './CanvasService'
import {FileService} from './FileService'
import {TreeNode, TreeService} from './TreeService'
import {info} from '@/remote'
import {reconcile, SetStoreFunction, unwrap} from 'solid-js/store'
import {DB} from '@/db'

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
    let navigateTo: Openable | undefined = undefined

    const doEmptyBin = async (node: TreeNode): Promise<boolean> => {
      let shouldDelete = node.item.deleted ?? false

      for (const n of node.tree) {
        const shouldDeleteChild = await doEmptyBin(n)
        if (!shouldDeleteChild) shouldDelete = false
      }

      if (shouldDelete) {
        if (this.fileService.currentFile?.id === node.item.id) {
          navigateTo = this.getNavigateTo(node)
        }

        await this.foreverDeleteNode(node)
      }

      return shouldDelete
    }

    for (const n of this.treeService.tree) {
      await doEmptyBin(n)
    }

    if (navigateTo) {
      this.resetArgs()
    }

    return {navigateTo}
  }

  async delete(node: TreeNode, forever = false): Promise<DeleteResult> {
    const navigateTo = this.getNavigateTo(node)

    const proms = [this.deleteNode(node, forever)]
    this.treeService.descendants((n) => proms.push(this.deleteNode(n, forever)), node.tree)
    await Promise.all(proms)

    this.treeService.create()

    if (navigateTo) {
      this.resetArgs()
    }

    return {navigateTo}
  }

  private getNavigateTo(node: TreeNode): Openable | undefined {
    // Navigate to root if no parent
    if (node.item.parentId === undefined) {
      return undefined
    }

    const currentFile = this.fileService.currentFile

    // Navigate to parent of deleted node if current file is deleted
    // or if current file is an anchestor of deleted node
    if (
      this.store.mode !== Mode.Canvas &&
      currentFile &&
      (node.item.id === currentFile.id ||
        this.treeService.isDescendant(currentFile.id, node.tree)) &&
      node.item.parentId !== undefined
    ) {
      const file = this.fileService.findFileById(node.item.parentId)
      return file//`/${file.code ? 'code' : 'editor'}/${node.item.parentId}`
    }

    // return undefined
  }

  private async deleteNode(node: TreeNode, forever = false) {
    // delete forever if no subtree and not modified or forever=true
    if ((node.tree.length === 0 && !node.item.lastModified) || forever) {
      await this.foreverDeleteNode(node)
      return
    }

    // soft delete file
    if (isFile(node.item)) {
      this.fileService.updateFile(node.item.id, {
        deleted: true,
        active: false,
        lastModified: new Date(),
      })

      const updatedFile = this.fileService.findFileById(node.item.id)
      if (!updatedFile) return

      await FileService.saveFile(updatedFile)
      info('File deleted')
    }

    // soft delete canvas
    if (isCanvas(node.item)) {
      const canvas = this.canvasService.findCanvas(node.item.id)
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

  private async foreverDeleteNode(node: TreeNode) {
    const id = node.item.id

    if (isFile(node.item)) {
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
          if (updated) await DB.updateCanvas(unwrap(updated))
        }
      }

      await DB.deleteFile(id)
      info('File forever deleted')
    }
  }

  private resetArgs() {
    this.setState('args', reconcile({cwd: this.store.args?.cwd}))
  }
}
