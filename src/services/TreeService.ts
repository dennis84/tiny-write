import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {createTreeStore, type Tree, type TreeItem, type TreeState} from '@/tree'
import type {Canvas, File, State} from '@/types'

export type MenuTree = TreeState<File | Canvas>
export type MenuTreeItem = TreeItem<File | Canvas>

export class TreeService {
  public tree: Tree<File | Canvas>

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {
    this.tree = createTreeStore()
  }

  reset(items: (File | Canvas)[]) {
    this.tree.reset(items)
  }

  add(item: File | Canvas): MenuTreeItem[] {
    return this.tree.add(item)
  }

  remove(id: string): MenuTreeItem[] {
    return this.tree.remove(id)
  }

  move(id: string, toId: string | undefined): MenuTreeItem[] {
    return this.tree.move(id, toId)
  }

  after(id: string, toId: string): MenuTreeItem[] {
    return this.tree.after(id, toId)
  }

  before(id: string, toId: string): MenuTreeItem[] {
    return this.tree.before(id, toId)
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
}
