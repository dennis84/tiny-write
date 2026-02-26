import {useLocation} from '@solidjs/router'
import {homeDir} from '@tauri-apps/api/path'
import {type DirEntry, readDir} from '@tauri-apps/plugin-fs'
import {createResource, For, Index, Suspense} from 'solid-js'
import {styled} from 'solid-styled-components'
import {resolvePath, toRelativePath} from '@/remote/editor'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {IconDescription, IconFolder, IconFolderOpen} from '../Icon'
import {Content, Scroll} from '../Layout'

const CurrentPath = styled.div`
  display: flex;
  align-items: center;
  padding: 5px;
  color: var(--background-40);
  flex-wrap: wrap;
  line-height: 1.5;
  .icon {
    margin-right: 5px;
  }
`

const Link = styled.a<{isDirectory: boolean}>`
  display: flex;
  align-items: center;
  padding: 3px;
  margin: 0;
  border-radius: var(--border-radius);
  cursor: var(--cursor-pointer);
  color: var(--background-40);
  line-height: 1.5;
  ${(p) => (p.isDirectory ? `font-weight: bold;` : '')}
  .icon {
    margin-right: 5px;
  }
  &:hover {
    background: var(--background-90);
    color: var(--foreground);
  }
`

const PathSegment = styled.span`
  color: var(--background-40);
  cursor: var(--cursor-pointer);
  &:hover {
    color: var(--foreground);
  }
`

interface DirState {
  path?: string[]
}

export const DirPage = () => {
  const {store, fileService, locationService} = useState()
  const location = useLocation<DirState>()

  info('Render DirPage')

  const getResolvedPath = async (name?: string) => {
    const path = [...(location.state?.path ?? [])]
    if (name) path.push(name)
    return await resolvePath(path.join('/'), store.args?.cwd)
  }

  const [currentPath] = createResource(async () => {
    const home = await homeDir()
    return await toRelativePath(store.args?.cwd ?? '', home)
  })

  const [dirEntries] = createResource<DirEntry[]>(
    async () => {
      const path = await getResolvedPath()
      if (!path) return []
      const entries = await readDir(path)
      const sorted = entries.sort((a, b) => a.name.localeCompare(b.name))
      const dirs = []
      const files = []

      for (const entry of sorted) {
        if (entry.isDirectory) dirs.push(entry)
        else files.push(entry)
      }

      return [...dirs, ...files]
    },
    {initialValue: []},
  )

  const clickPathSegment = (index: number) => {
    const path = [...(location.state?.path ?? [])]
    path.splice(index)
    locationService.openDir(path)
  }

  const DirEntryLink = (p: {entry: DirEntry}) => {
    const onClick = async () => {
      if (p.entry.isDirectory) {
        const path = location.state?.path ?? []
        path.push(p.entry.name)
        locationService.openDir(path)
        return
      }

      const path = await getResolvedPath(p.entry.name)
      const file = await fileService.newFileByPath(path)

      locationService.openItem(file)
    }

    return (
      <Link data-testid="link" onClick={onClick} isDirectory={p.entry.isDirectory}>
        {p.entry.isDirectory ? <IconFolder /> : <IconDescription />} {p.entry.name}
        {p.entry.isDirectory && '/'}
      </Link>
    )
  }

  return (
    <Scroll data-testid="dir" data-tauri-drag-region="true">
      <Content style={{width: '100%'}} data-tauri-drag-region="true">
        <CurrentPath>
          <IconFolderOpen />
          <PathSegment onClick={() => clickPathSegment(0)}>{currentPath()}/</PathSegment>
          <For each={location.state?.path}>
            {(p, i) => <PathSegment onClick={() => clickPathSegment(i() + 1)}>{p}/</PathSegment>}
          </For>
        </CurrentPath>
        <Suspense>
          <Index each={dirEntries()}>{(entry) => <DirEntryLink entry={entry()} />}</Index>
        </Suspense>
      </Content>
    </Scroll>
  )
}
