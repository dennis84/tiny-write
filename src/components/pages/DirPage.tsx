import {createEffect, createSignal, For, Show} from 'solid-js'
import {useLocation, useNavigate} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {DirEntry, readDir} from '@tauri-apps/plugin-fs'
import {useState} from '@/state'
import {getMimeType, info, resolvePath} from '@/remote'
import {Content, Scroll} from '../Layout'
import {ButtonPrimary} from '../Button'

const Link = styled('a')`
  padding: 10px;
  margin: 0;
  display: block;
  border-radius: var(--border-radius);
  cursor: var(--cursor-pointer);
  color: var(--foreground-60);
  &:hover {
    background: var(--foreground-10);
    color: var(--foreground);
  }
`

interface DirState {
  path?: string[]
}

export const DirPage = () => {
  const {store, editorService, fileService} = useState()
  const [dirEntries, setDirEntries] = createSignal<DirEntry[]>()
  const navigate = useNavigate()
  const location = useLocation<DirState>()

  const getResolvedPath = async (name?: string) => {
    const path = location.state?.path ?? []
    if (name) path.push(name)
    return await resolvePath(path.join('/'), store.args?.cwd)
  }

  const onNew = async () => {
    const file = await editorService.newFile()
    navigate(`/editor/${file.id}`)
  }

  const onBack = async () => {
    history.back()
  }

  const FileLink = (p: {baseDir: string; entry: DirEntry}) => {
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

      navigate(`/${code ? 'code' : 'editor'}/${file.id}`)
    }

    return (
      <Link data-testid="link" onClick={onClick}>
        {p.entry.name}
        {p.entry.isDirectory && '/'}
      </Link>
    )
  }

  const Empty = () => (
    <>
      <p>
        No markdown/plain text file in: <code>{store.args?.cwd}</code>
      </p>
      <ButtonPrimary onClick={onNew}>New File</ButtonPrimary>
    </>
  )

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
      <Content config={store.config} data-tauri-drag-region="true">
        <p>Click to open file:</p>
        <For each={dirEntries()} fallback={<Empty />}>
          {(entry) => <FileLink entry={entry} />}
        </For>
        <br />
        <Show when={location.state?.path?.length}>
          <ButtonPrimary onClick={onBack}>Back</ButtonPrimary>
        </Show>
      </Content>
    </Scroll>
  )
}
