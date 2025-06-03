import {createEffect, createSignal, For, onMount} from 'solid-js'
import {useLocation} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {type DirEntry, readDir} from '@tauri-apps/plugin-fs'
import {homeDir} from '@tauri-apps/api/path'
import {useState} from '@/state'
import {resolvePath, toRelativePath} from '@/remote/editor'
import {useOpen} from '@/hooks/open'
import {Content, Scroll} from '../Layout'
import {IconDescription, IconFolder, IconFolderOpen} from '../Icon'

const CurrentPath = styled('div')`
  display: flex;
  align-items: center;
  padding: 5px;
  color: var(--foreground-60);
  flex-wrap: wrap;
  line-height: 1.5;
  .icon {
    margin-right: 5px;
  }
`

const Link = styled('a')`
  display: flex;
  align-items: center;
  padding: 3px;
  margin: 0;
  border-radius: var(--border-radius);
  cursor: var(--cursor-pointer);
  color: var(--foreground-60);
  line-height: 1.5;
  ${(props: any) => (props.isDirectory ? `font-weight: bold;` : '')}
  .icon {
    margin-right: 5px;
  }
  &:hover {
    background: var(--foreground-10);
    color: var(--foreground);
  }
`

const PathSegment = styled('span')`
  color: var(--foreground-60);
  cursor: var(--cursor-pointer);
  &:hover {
    color: var(--foreground);
  }
`

interface DirState {
  path?: string[]
}

export const DirPage = () => {
  const {store, fileService} = useState()
  const [dirEntries, setDirEntries] = createSignal<DirEntry[]>()
  const [currentPath, setCurrentPath] = createSignal<string>()
  const {open, openDir} = useOpen()
  const location = useLocation<DirState>()

  const getResolvedPath = async (name?: string) => {
    const path = [...(location.state?.path ?? [])]
    if (name) path.push(name)
    return await resolvePath(path.join('/'), store.args?.cwd)
  }

  const clickPathSegment = (index: number) => {
    const path = [...(location.state?.path ?? [])]
    path.splice(index)
    openDir(path)
  }

  const DirEntryLink = (p: {entry: DirEntry}) => {
    const onClick = async () => {
      if (p.entry.isDirectory) {
        const path = location.state?.path ?? []
        path.push(p.entry.name)
        openDir(path)
        return
      }

      const path = await getResolvedPath(p.entry.name)
      const file = await fileService.newFileByPath(path)

      open(file, {back: true})
    }

    return (
      <Link data-testid="link" onClick={onClick} isDirectory={p.entry.isDirectory}>
        {p.entry.isDirectory ? <IconFolder /> : <IconDescription />} {p.entry.name}
        {p.entry.isDirectory && '/'}
      </Link>
    )
  }

  onMount(async () => {
    const home = await homeDir()
    const relative = await toRelativePath(store.args?.cwd ?? '', home)
    setCurrentPath(relative)
  })

  createEffect(async () => {
    const path = await getResolvedPath()
    if (!path) return
    const entries = await readDir(path)
    const sorted = entries.sort((a, b) => a.name.localeCompare(b.name))
    const dirs = []
    const files = []

    for (const entry of sorted) {
      if (entry.isDirectory) dirs.push(entry)
      else files.push(entry)
    }

    setDirEntries([...dirs, ...files])
  })

  return (
    <Scroll data-testid="dir" data-tauri-drag-region="true">
      <Content style={{width: '100%'}} config={store.config} data-tauri-drag-region="true">
        <CurrentPath>
          <IconFolderOpen />
          <PathSegment onClick={() => clickPathSegment(0)}>{currentPath()}/</PathSegment>
          <For each={location.state?.path}>
            {(p, i) => <PathSegment onClick={() => clickPathSegment(i() + 1)}>{p}/</PathSegment>}
          </For>
        </CurrentPath>
        <For each={dirEntries()}>{(entry) => <DirEntryLink entry={entry} />}</For>
      </Content>
    </Scroll>
  )
}
