import {SetStoreFunction, Store, createMutable, unwrap} from 'solid-js/store';
import {Canvas, File, State, isFile} from '@/state'
import {Ctrl} from '.'

export type TreeNodeItem = File | Canvas;

export interface TreeNode {
  item: TreeNodeItem;
  tree: TreeNode[];
}

interface TmpNode {
  item?: File | Canvas;
  tree: TmpNode[];
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

    for (const f of this.store.files) {
      const file = unwrap(f)
      if (!tmp[file.id]) tmp[file.id] = {item: file, tree: []}
      else tmp[file.id].item = file
      const node = tmp[file.id]

      if (!file.parentId) root.push(node)
      else if (!tmp[file.parentId]) tmp[file.parentId] = {tree: [node]}
      else tmp[file.parentId].tree.push(node)
    }

    for (const c of this.store.canvases) {
      const canvas = unwrap(c)
      const node = {item: canvas, tree: []}
      tmp[canvas.id] = node
      if (!canvas.parentId) root.push(node)
      else tmp[canvas.parentId].tree.push(node)
    }

    root = root as TreeNode[]
    root = this.sortTree(root)
    this.tree.splice(0, this.tree.length)
    this.tree.push(...root)
  }

  add(node: TreeNode, to: TreeNode) {
    const parentId = to.item.id
    const leftId = to.tree[to.tree.length-1]?.item.id
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
      this.saveNode(rightNode)
    }
    this.updateItem(node.item.id, parentId, leftId)
    this.saveNode(node)
    this.create()
  }

  after(node: TreeNode, before: TreeNode) {
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
      this.saveNode(rightNode)
    }

    const rightBefore = this.findTreeNodeByLeftId(before.item.id)
    if (rightBefore) {
      this.updateItem(rightBefore.item.id, rightBefore.item.parentId, node.item.id)
      this.saveNode(rightBefore)
    }

    this.updateItem(node.item.id, before.item.parentId, before.item.id)
    this.saveNode(node)
    this.create()
  }

  before(node: TreeNode, after: TreeNode) {
    const parentId = after.item.parentId
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
      this.saveNode(rightNode)
    }
    this.updateItem(node.item.id, parentId, after.item.leftId)
    this.updateItem(after.item.id, parentId, node.item.id)
    this.saveNode(node)
    this.saveNode(after)
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
      const nextLeftId = sorted[sorted.length-1]?.item.id

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

    return [...sorted, ...nulls, ...unsorted]
  }

  private saveNode(node: TreeNode) {
    if (isFile(node.item)) {
      this.ctrl.file.saveFile(node.item)
    } else {
      this.ctrl.canvas.saveCanvas(node.item)
    }
  }
}
