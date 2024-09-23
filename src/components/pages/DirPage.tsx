import {createSignal, For, onMount} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {getMimeType, info, resolvePath} from '@/remote'
import {Content, Scroll} from '../Layout'
import {ButtonPrimary} from '../Button'
import {DirEntry, readDir} from '@tauri-apps/plugin-fs'
import path from 'node:path'

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

export const DirPage = () => {
  const {store, editorService, fileService} = useState()
  const [dirEntries, setDirEntries] = createSignal<DirEntry[]>()
  const navigate = useNavigate()

  const onNew = async () => {
    const file = await editorService.newFile()
    navigate(`/editor/${file.id}`)
  }

  const listDir = async (path: string) => {
    const entries = await readDir(path)
    setDirEntries(entries)
  }

  const FileLink = (props: {baseDir: string; entry: DirEntry}) => {
    const onClick = async () => {
      if (props.entry.isDirectory) {
        const path = await resolvePath(props.entry.name, props.baseDir)
        await listDir(path)
        return
      }

      const path = await resolvePath(props.entry.name, props.baseDir)
      let file = await fileService.findFileByPath(path)
      const mime = await getMimeType(path)
      const code = !mime.startsWith('text/markdown')
      info(`Open from dir (path=${path}, mime=${mime})`)

      if (!file) file = await editorService.newFile({path, code})

      navigate(`/${code ? 'code' : 'editor'}/${file.id}`)
    }

    return (
      <Link data-testid="link" onClick={onClick}>
        {props.entry.name}{props.entry.isDirectory && '/'}
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

  onMount(async () => {
    const root = store.args?.cwd
    if (!root) return
    await listDir(root)
  })

  return (
    <Scroll data-testid="dir" data-tauri-drag-region="true">
      <Content config={store.config} data-tauri-drag-region="true">
        <p>Click to open file:</p>
        <For each={dirEntries()} fallback={<Empty />}>
          {(entry) => <FileLink baseDir={store.args?.cwd!} entry={entry} />}
        </For>
      </Content>
    </Scroll>
  )
}
