import {createResource} from 'solid-js'
import {DB} from '@/db'
import {isProject} from '@/state'
import {createTreeStore, type Tree} from '@/tree'
import type {MenuItem, MenuTreeItem} from '@/types'

export class TreeService {
  public tree: Tree<MenuItem>
  private treeResource = createResource(() => DB.getTree())

  constructor() {
    this.tree = createTreeStore()
  }

  reset(items: MenuItem[]) {
    this.tree.reset(items)
  }

  setValue(value: MenuItem) {
    this.tree.setValue(value.id, value)
  }

  add(item: MenuItem): MenuTreeItem[] {
    return this.tree.add(item)
  }

  addAll(items: MenuItem[]): MenuTreeItem[] {
    return this.tree.addAll(items)
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

  isMoveAllowed(id: string, toId?: string): boolean {
    if (!toId || id === toId) return false

    // if target is descendant of dragged node
    const isDescendant = this.isDescendant(toId, id)
    if (isDescendant) return false

    const item = this.getItem(id)
    if (isProject(item?.value)) {
      return this.tree.rootItemIds.includes(toId)
    }

    return true
  }

  isDescendant(id: string, parentId: string): boolean {
    return this.tree.isDescendant(id, parentId)
  }

  descendants(fn: (n: MenuTreeItem) => void, parentId: string | undefined = undefined) {
    return this.tree.descendants(fn, parentId)
  }

  getDescendants(parentId: string | undefined = undefined): MenuTreeItem[] {
    const result: MenuTreeItem[] = []
    this.tree.descendants((n) => result.push(n), parentId)
    return result
  }

  ancestors(fn: (n: MenuTreeItem) => void, id: string) {
    return this.tree.ancestors(fn, id)
  }

  getAncestors(id: string): MenuTreeItem[] {
    const result: MenuTreeItem[] = []
    this.tree.ancestors((n) => result.push(n), id)
    return result
  }

  getItem(id: string): MenuTreeItem | undefined {
    return this.tree.getItem(id)
  }

  getProjectItem(id: string): MenuTreeItem | undefined {
    let project: MenuTreeItem | undefined

    const cur = this.getItem(id)
    if (isProject(cur?.value)) {
      return cur
    }

    this.ancestors((n) => {
      if (isProject(n.value)) {
        project = n
      }
    }, id)

    return project
  }

  async collapse(id: string) {
    const item = this.tree.getItem(id)
    if (!item) return

    const [tree, {mutate}] = this.treeResource
    mutate((prev) => {
      const collapsed = prev?.collapsed ?? []
      if (collapsed.includes(item.id)) {
        return {...prev, collapsed: collapsed.filter((id) => id !== item.id)}
      } else {
        return {...prev, collapsed: [...collapsed, item.id]}
      }
    })

    if (tree.latest) await DB.setTree(tree.latest)
  }

  isCollapsed(id: string): boolean {
    return this.treeResource[0]()?.collapsed.includes(id) ?? false
  }
}
