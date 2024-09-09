import {For} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
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

export const Dir = () => {
  const {store, editorService, fileService} = useState()
  const navigate = useNavigate()

  const onNew = async () => {
    const file = await editorService.newFile()
    navigate(`/editor/${file.id}`)
  }

  const FileLink = (props: {path: string}) => {
    const onClick = async () => {
      let file = await fileService.findFileByPath(props.path)
      if (!file) file = await editorService.newFile({path: props.path})
      navigate(`/editor/${file.id}`)
    }

    return <Link data-testid="link" onClick={onClick}>{props.path}</Link>
  }

  const Empty = () => (
    <>
      <p>
        No markdown/plain text file in: <code>{store.args?.cwd}</code>
      </p>
      <ButtonPrimary onClick={onNew}>New File</ButtonPrimary>
    </>
  )

  return (
    <Scroll data-testid="dir" data-tauri-drag-region="true">
      <Content config={store.config} data-tauri-drag-region="true">
        <p>Click to open file:</p>
        <For each={store.args?.dir} fallback={<Empty />}>
          {(path) => <FileLink path={path} />}
        </For>
      </Content>
    </Scroll>
  )
}
