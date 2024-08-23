import {SetStoreFunction, Store, createMutable, unwrap} from 'solid-js/store'
import {Canvas, File, State, isFile} from '@/state'
import {DB} from '@/db'
import {Ctrl} from '.'
import {FileService} from './FileService'

export type TreeNodeItem = File | Canvas

export interface TreeNode {
  item: TreeNodeItem
  tree: TreeNode[]
}

interface TmpNode {
  item?: File | Canvas
  tree: TmpNode[]
}

export class TreeService {
  public tree = createMutable<TreeNode[]>([])

  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  create() {
    const tmp: Record<string, TmpNode> = {}
    let root = []

    const items = [...this.store.files, ...this.store.canvases]
    for (const i of items) {
      const item = unwrap(i)
      if (!tmp[item.id]) tmp[item.id] = {item, tree: []}
      else tmp[item.id].item = item
      const node = tmp[item.id]

      if (!item.parentId) root.push(node)
      else if (!tmp[item.parentId]) tmp[item.parentId] = {tree: [node]}
      else tmp[item.parentId].tree.push(node)
    }

    root = root as TreeNode[]
    root = this.sortTree(root)
    this.tree.splice(0, this.tree.length)
    this.tree.push(...root)
  }

  async add(node: TreeNode, to: TreeNode) {
    const parentId = to.item.id
    const leftId = to.tree[to.tree.length - 1]?.item.id
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
      await this.saveNode(rightNode)
    }
    this.updateItem(node.item.id, parentId, leftId)
    await this.saveNode(node)
    this.create()
  }

  async after(node: TreeNode, before: TreeNode) {
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
      await this.saveNode(rightNode)
    }

    const rightBefore = this.findTreeNodeByLeftId(before.item.id)
    if (rightBefore) {
      this.updateItem(rightBefore.item.id, rightBefore.item.parentId, node.item.id)
      await this.saveNode(rightBefore)
    }

    this.updateItem(node.item.id, before.item.parentId, before.item.id)
    await this.saveNode(node)
    this.create()
  }

  async before(node: TreeNode, after: TreeNode) {
    const parentId = after.item.parentId
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
      await this.saveNode(rightNode)
    }
    this.updateItem(node.item.id, parentId, after.item.leftId)
    this.updateItem(after.item.id, parentId, node.item.id)
    await this.saveNode(node)
    await this.saveNode(after)
    this.create()
  }

  isDescendant(id: string, tree = this.tree): boolean {
    return this.findTreeNode(id, tree) ? true : false
  }

  descendants(fn: (n: TreeNode) => void, tree = this.tree) {
    for (const n of tree) {
      fn(n)
      this.descendants(fn, n.tree)
    }
  }

  findTreeNode(id: string, tree = this.tree): TreeNode | undefined {
    for (const n of tree) {
      if (n.item.id === id) return n
      const c = this.findTreeNode(id, n.tree)
      if (c) return c
    }
  }

  async collapse(node: TreeNode) {
    if (!node.tree.length) return

    this.setState('tree', (prev) => {
      const collapsed = prev?.collapsed ?? []
      if (collapsed.includes(node.item.id)) {
        return {...prev, collapsed: collapsed.filter((id) => id !== node.item.id)}
      } else {
        return {...prev, collapsed: [...collapsed, node.item.id]}
      }
    })

    const tree = unwrap(this.store.tree)
    if (!tree) return
    await DB.setTree({...tree})
  }

  isCollapsed(node: TreeNode): boolean {
    return this.store.tree?.collapsed.includes(node.item.id) ?? false
  }

  private findTreeNodeByLeftId(leftId: string, tree = this.tree): TreeNode | undefined {
    for (const n of tree) {
      if (n.item.leftId === leftId) return n
      const c = this.findTreeNodeByLeftId(leftId, n.tree)
      if (c) return c
    }
  }

  private updateItem(id: string, parentId?: string, leftId?: string) {
    const fileIndex = this.store.files.findIndex((f) => f.id === id)
    if (fileIndex !== -1) {
      this.setState('files', fileIndex, {parentId, leftId})
      return
    }

    const canvasIndex = this.store.canvases.findIndex((it) => it.id === id)
    if (canvasIndex !== -1) {
      this.setState('canvases', canvasIndex, {parentId, leftId})
    }
  }

  private sortTree(tree: TreeNode[]): TreeNode[] {
    const sorted: TreeNode[] = []
    const unsorted = [...tree]
    const nulls = []

    outer: for (const node of tree) {
      const nextLeftId = sorted[sorted.length - 1]?.item.id

      if (node.tree.length > 0) {
        node.tree = this.sortTree(node.tree)
      }

      for (let i = 0; i < unsorted.length; i++) {
        const searchNode = unsorted[i]
        if (searchNode.item.leftId === nextLeftId) {
          sorted.push(searchNode)
          unsorted.splice(i, 1)
          continue outer
        } else if (!searchNode.item.leftId) {
          nulls.push(searchNode)
          unsorted.splice(i, 1)
          continue outer
        }
      }
    }

    for (const n of nulls) {
      const nextLeftId = sorted[sorted.length - 1]?.item.id
      n.item.leftId = nextLeftId
      sorted.push(n)
    }

    for (const u of unsorted) {
      const nextLeftId = sorted[sorted.length - 1]?.item.id
      u.item.leftId = nextLeftId
      sorted.push(u)
    }

    return sorted
  }

  private async saveNode(node: TreeNode) {
    if (isFile(node.item)) {
      await FileService.saveFile(node.item)
    } else {
      await this.ctrl.canvas.saveCanvas(node.item)
    }
  }
}
