import {SetStoreFunction, Store, createStore, unwrap} from 'solid-js/store';
import {Canvas, File, State} from '@/state'

type TreeNodeItem = File | Canvas;

export interface TreeNode {
  item: TreeNodeItem;
  tree: TreeNode[];
}

interface TmpNode {
  item?: File | Canvas;
  tree: TmpNode[];
}

export class TreeService {

  private treeStore = createStore<TreeNode[]>([])

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get tree() {
    return this.treeStore[0]
  }

  private get setTree() {
    return this.treeStore[1]
  }

  create() {
    const tmp: Record<string, TmpNode> = {}
    let tree = []

    for (const file of this.store.files) {
      if (!tmp[file.id]) tmp[file.id] = {item: unwrap(file), tree: []}
      else tmp[file.id].item = unwrap(file)
      const node = tmp[file.id]

      if (!file.parentId) tree.push(node)
      else if (!tmp[file.parentId]) tmp[file.parentId] = {tree: [node]}
      else tmp[file.parentId].tree.push(node)
    }

    for (const canvas of this.store.canvases) {
      const node = {item: unwrap(canvas), tree: []}
      tmp[canvas.id] = node
      if (!canvas.parentId) tree.push(node)
      else tmp[canvas.parentId].tree.push(node)
    }

    tree = tree as TreeNode[]
    tree = this.sortTree(tree)
    this.setTree(tree)
  }

  add(node: TreeNode, to: TreeNode) {
    const parentId = to.item.id
    const leftId = to.tree[to.tree.length-1]?.item.id
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
    }
    this.updateItem(node.item.id, parentId, leftId)
    this.create()
  }

  after(node: TreeNode, before: TreeNode) {
    const parentId = before.item.parentId
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
    }

    const rightBefore = this.findTreeNodeByLeftId(before.item.id)
    if (rightBefore) {
      this.updateItem(rightBefore.item.id, rightBefore.item.parentId, node.item.leftId)
    }

    this.updateItem(node.item.id, parentId, before.item.id)
    this.create()
  }

  before(node: TreeNode, after: TreeNode) {
    const parentId = after.item.parentId
    const rightNode = this.findTreeNodeByLeftId(node.item.id)
    if (rightNode) {
      this.updateItem(rightNode.item.id, rightNode.item.parentId, node.item.leftId)
    }
    this.updateItem(node.item.id, parentId, after.item.leftId)
    this.updateItem(after.item.id, parentId, node.item.id)
    this.create()
  }

  findTreeNode(id: string, tree: TreeNode[] = this.tree): TreeNode | undefined {
    for (const n of tree) {
      if (n.item.id === id) return n
      const c = this.findTreeNode(id, n.tree)
      if (c) return c
    }
  }

  private findTreeNodeByLeftId(leftId: string, tree: TreeNode[] = this.tree): TreeNode | undefined {
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

    return [...sorted, ...nulls]
  }
}
