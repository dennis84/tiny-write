import {Show} from 'solid-js'
import {isDeletable, useState} from '@/state'
import type {MenuTreeItem} from '@/types'
import {DropLine, TreeNode} from './Style'
import {useTreeUi} from './Submenu'
import {Tree} from './Tree'
import {TreeLink} from './TreeLink'

export const TreeItem = (p: {id: string; level: number}) => {
  const {treeService} = useState()
  const tree = useTreeUi()
  const isDraggedOver = (node: MenuTreeItem) => tree.dropState()?.targetId === node.id
  const isDeleted = (node: MenuTreeItem) => isDeletable(node.value) && node.value.deleted

  return (
    <Show when={treeService.getItem(p.id)}>
      {(item) => (
        <Show when={tree.showDeleted || !isDeleted(item())}>
          <Show when={isDraggedOver(item()) && tree.dropState()?.pos === 'before'}>
            <DropLine level={p.level} />
          </Show>
          <TreeNode selected={isDraggedOver(item()) && tree.dropState()?.pos === 'add'}>
            <TreeLink node={item()} level={p.level} />
            <Show when={item().childrenIds.length > 0 && !treeService.isCollapsed(item().id)}>
              <Tree childrenIds={item().childrenIds} level={p.level + 1} />
            </Show>
          </TreeNode>
          <Show when={isDraggedOver(item()) && tree.dropState()?.pos === 'after'}>
            <DropLine level={p.level} />
          </Show>
        </Show>
      )}
    </Show>
  )
}
