import {Match, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {type ButtonAttrs, IconButton} from '@/components/Button'
import {IconChevronDown, IconChevronRight, IconDot, IconDotLarge} from '@/components/icons/Ui'
import {isDirectory, isDirty, isFile, isProject, useState} from '@/state'
import type {MenuTreeItem} from '@/types'

interface Props {
  node: MenuTreeItem
  level: number
  onClick: () => void
}

const TreeToggle = styled<ButtonAttrs & {level: number}>(IconButton)`
  flex-shrink: 0;
  ${(p) => (p.level ? `margin-left: ${String(20 * p.level)}px;` : '')}
`

const TreeToggleDisabled = styled<ButtonAttrs & {level: number}>(IconButton)`
  flex-shrink: 0;
  pointer-events: none;
  ${(p) => (p.level ? `margin-left: ${String(20 * p.level)}px;` : '')}
`

export const TreeLinkToggle = (p: Props) => {
  const {treeService} = useState()
  return (
    <Switch>
      <Match
        when={
          (isDirectory(p.node.value) && p.node.childrenIds.length === 0) ||
          (isProject(p.node.value) &&
            p.node.value.worktreePath &&
            p.node.childrenIds.length === 0) ||
          treeService.isCollapsed(p.node.id)
        }
      >
        <TreeToggle class="toggle" level={p.level} onClick={p.onClick}>
          <IconChevronRight />
        </TreeToggle>
      </Match>
      <Match when={p.node.childrenIds.length > 0}>
        <TreeToggle class="toggle" level={p.level} onClick={p.onClick}>
          <IconChevronDown />
        </TreeToggle>
      </Match>
      <Match when={isFile(p.node.value) && isDirty(p.node.value)}>
        <TreeToggleDisabled class="toggle" level={p.level}>
          <IconDotLarge />
        </TreeToggleDisabled>
      </Match>
      <Match when={true}>
        <TreeToggleDisabled class="toggle" level={p.level}>
          <IconDot />
        </TreeToggleDisabled>
      </Match>
    </Switch>
  )
}
