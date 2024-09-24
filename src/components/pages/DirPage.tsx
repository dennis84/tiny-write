import {createEffect, createSignal, For, onMount} from 'solid-js'
import {useLocation, useNavigate} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {DirEntry, readDir} from '@tauri-apps/plugin-fs'
import {homeDir} from '@tauri-apps/api/path'
import {useState} from '@/state'
import {getMimeType, info, resolvePath, toRelativePath} from '@/remote'
import {Content, Scroll} from '../Layout'
import {Icon} from '../Icon'

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
  const {store, editorService, fileService} = useState()
  const [dirEntries, setDirEntries] = createSignal<DirEntry[]>()
  const [currentPath, setCurrentPath] = createSignal<string>()
  const navigate = useNavigate()
  const location = useLocation<DirState>()

  const getResolvedPath = async (name?: string) => {
    const path = [...(location.state?.path ?? [])]
    if (name) path.push(name)
    return await resolvePath(path.join('/'), store.args?.cwd)
  }

  const onNew = async () => {
    const file = await editorService.newFile()
    navigate(`/editor/${file.id}`)
  }

  const clickPathSegment = (index: number) => {
    const path = [...(location.state?.path ?? [])]
    path.splice(index)
    navigate('/dir', {state: {path}})
  }

  const DirEntryLink = (p: {entry: DirEntry}) => {
    const onClick = async () => {
      if (p.entry.isDirectory) {
        const path = location.state?.path ?? []
        path.push(p.entry.name)
        navigate('/dir', {state: {path}})
        return
      }

      const path = await getResolvedPath(p.entry.name)
      let file = await fileService.findFileByPath(path)
      const mime = await getMimeType(path)
      const code = !mime.startsWith('text/markdown')
      info(`Open from dir (path=${path}, mime=${mime})`)

      if (!file) file = await editorService.newFile({path, code})

      const prev = location.pathname
      navigate(`/${code ? 'code' : 'editor'}/${file.id}`, {
        state: {prev, path: location.state?.path},
      })
    }

    return (
      <Link data-testid="link" onClick={onClick} isDirectory={p.entry.isDirectory}>
        <Icon>{p.entry.isDirectory ? 'folder' : 'description'}</Icon> {p.entry.name}
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
          <Icon>folder_open</Icon>
          <PathSegment onClick={() => clickPathSegment(0)}>{currentPath()}/</PathSegment>
          <For each={location.state?.path}>
            {(p, i) => <PathSegment onClick={() => clickPathSegment(i() + 1)}>{p}/</PathSegment>}
          </For>
        </CurrentPath>
        <For each={dirEntries()}>
          {(entry) => <DirEntryLink entry={entry} />}
        </For>
      </Content>
    </Scroll>
  )
}
