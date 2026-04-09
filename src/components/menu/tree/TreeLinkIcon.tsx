import {Match, Show, Switch} from 'solid-js'
import {FileService} from '@/services/FileService'
import {isCanvas, isDirectory, isFile, isFilename, isProject, useState} from '@/state'
import type {MenuTreeItem} from '@/types'
import {IconCanvas, IconFolder, IconFolderOpen, IconFolderRoot} from '../../icons/File'
import {LangIcon} from '../../icons/LangIcon'

interface Props {
  node: MenuTreeItem
}

export const TreeLinkIcon = (p: Props) => {
  const {treeService} = useState()

  return (
    <Switch>
      {/* Directory */}
      <Match
        when={
          isDirectory(p.node.value) &&
          (p.node.childrenIds.length === 0 || treeService.isCollapsed(p.node.id))
        }
      >
        <IconFolder />
      </Match>
      <Match when={isDirectory(p.node.value)}>
        <IconFolderOpen />
      </Match>
      {/* Local Filename */}
      <Match when={isFilename(p.node.value) ? p.node.value : undefined}>
        {(item) => <LangIcon name={FileService.guessCodeLang({path: item().path})} />}
      </Match>
      {/* Project */}
      <Match when={isProject(p.node.value)}>
        <IconFolderRoot />
      </Match>
      {/* Canvas */}
      <Match when={isCanvas(p.node.value)}>
        <IconCanvas />
      </Match>
      {/* Code */}
      <Match when={isFile(p.node.value) && p.node.value.code}>
        <Show
          when={
            isFile(p.node.value) &&
            (p.node.value.codeLang || !p.node.value.codeLang) /* eslint-disable-line */
          }
          keyed
        >
          <LangIcon name={isFile(p.node.value) ? p.node.value.codeLang : undefined} />
        </Show>
      </Match>
      {/* Editor */}
      <Match when={isFile(p.node.value)}>
        <LangIcon name="markdown" />
      </Match>
    </Switch>
  )
}
