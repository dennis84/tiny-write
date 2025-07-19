import type {SetStoreFunction, Store} from 'solid-js/store'
import {type Canvas, type File, type State, isFile} from '@/state'
import {createTreeStore, type TreeItem, type Tree, type TreeState} from '@/tree'
import {info} from '@/remote/log'
import {DB} from '@/db'
import {FileService} from './FileService'
import {CanvasService} from './CanvasService'

export type MenuTree = TreeState<File | Canvas>
export type MenuTreeItem = TreeItem<File | Canvas>

export class TreeService {
  public tree: Tree<File | Canvas>

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
    private fileService: FileService,
    private canvasService: CanvasService,
  ) {
    const items = [...this.store.files, ...this.store.canvases]
    this.tree = createTreeStore({items})
  }

  updateAll() {
    const items = [...this.store.files, ...this.store.canvases]
    this.tree.updateAll(items)
  }

  updateValue(item: File | Canvas) {
    this.tree.updateValue(item)
  }

  async add(item: File | Canvas) {
    const ids = this.tree.add(item)
    for (const i of ids) {
      await this.saveItem(i)
    }
  }

  remove(id: string) {
    this.tree.remove(id)
  }

  async move(id: string, toId: string | undefined) {
    const ids = this.tree.move(id, toId)
    for (const i of ids) {
      await this.saveItem(i)
    }
  }

  async after(id: string, toId: string) {
    const ids = this.tree.after(id, toId)
    for (const i of ids) {
      await this.saveItem(i)
    }
  }

  async before(id: string, toId: string) {
    const ids = this.tree.before(id, toId)
    for (const i of ids) {
      await this.saveItem(i)
    }
  }

  isDescendant(id: string, parentId: string): boolean {
    return this.tree.isDescendant(id, parentId)
  }

  descendants(fn: (n: MenuTreeItem) => void, parentId: string | undefined = undefined) {
    return this.tree.descendants(fn, parentId)
  }

  getItem(id: string): MenuTreeItem | undefined {
    return this.tree.getItem(id)
  }

  async collapse(id: string) {
    const item = this.tree.getItem(id)
    if (!item) return
    if (!item.childrenIds.length) return

    this.setState('tree', (prev) => {
      const collapsed = prev?.collapsed ?? []
      if (collapsed.includes(item.id)) {
        return {...prev, collapsed: collapsed.filter((id) => id !== item.id)}
      } else {
        return {...prev, collapsed: [...collapsed, item.id]}
      }
    })

    const tree = this.store.tree
    if (!tree) return
    await DB.setTree(tree)
  }

  isCollapsed(id: string): boolean {
    return this.store.tree?.collapsed.includes(id) ?? false
  }

  private async saveItem(id: string) {
    const item = this.tree.getItem(id)
    if (!item) return
    const {parentId, leftId} = item
    info(`Save tree item (id=${id}, parentId=${parentId}, leftId=${leftId})`)
    if (isFile(item.value)) {
      this.fileService.updateFile(id, {leftId, parentId})
      await FileService.saveFile({...item.value, leftId, parentId})
    } else {
      this.canvasService.updateCanvas(id, {leftId, parentId})
      await CanvasService.saveCanvas({...item.value, leftId, parentId})
    }
  }
}
