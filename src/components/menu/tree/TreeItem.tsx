import {Show} from 'solid-js'
import type {MenuTreeItem} from '@/services/TreeService'
import {useState} from '@/state'
import {DropLine, TreeGroup} from './Style'
import {useTreeUi} from './Submenu'
import {Tree} from './Tree'
import {TreeLink} from './TreeLink'

export const TreeItem = (p: {id: string; level: number}) => {
  const {treeService} = useState()
  const tree = useTreeUi()
  const isDraggedOver = (node: MenuTreeItem) => tree.dropState()?.targetId === node.id
  return (
    <Show when={treeService.getItem(p.id)}>
      {(item) => (
        <Show when={tree.showDeleted || !item().value.deleted}>
          <Show when={isDraggedOver(item()) && tree.dropState()?.pos === 'before'}>
            <DropLine level={p.level} />
          </Show>
          <TreeGroup selected={isDraggedOver(item()) && tree.dropState()?.pos === 'add'}>
            <TreeLink node={item()} level={p.level} />
            <Show when={item().childrenIds.length > 0 && !treeService.isCollapsed(item().id)}>
              <Tree childrenIds={item().childrenIds} level={p.level + 1} />
            </Show>
          </TreeGroup>
          <Show when={isDraggedOver(item()) && tree.dropState()?.pos === 'after'}>
            <DropLine level={p.level} />
          </Show>
        </Show>
      )}
    </Show>
  )
}
