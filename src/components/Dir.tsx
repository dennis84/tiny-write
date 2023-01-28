import {For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Content, Scroll} from './Layout'
import {ButtonPrimary} from './Button'

const Link = styled('a')`
  padding: 10px;
  margin: 0;
  display: block;
  border-radius: 3px;
  cursor: pointer;
  color: var(--foreground-60);
  &:hover {
    background: var(--foreground-10);
    color: var(--foreground);
  }
`

export default () => {
  const [store, ctrl] = useState()

  const onNew = () => {
    ctrl.newFile()
    ctrl.setState('args.dir', undefined)
    store.editorView?.focus()
  }

  const FileLink = (props: {path: string}) => {
    const onClick = () => {
      ctrl.openFile({path: props.path})
      ctrl.setState('args.dir', undefined)
    }

    return (
      <Link onClick={onClick}>{props.path}</Link>
    )
  }

  const Empty = () => (
    <>
      <p>
        No markdown/plain text file in: <code>{store.args.cwd}</code>
      </p>
      <ButtonPrimary onClick={onNew}>New File</ButtonPrimary>
    </>
  )

  return (
    <Scroll
      data-testid="content"
      data-tauri-drag-region="true">
      <Content data-tauri-drag-region="true">
        <Show when={store.args.dir.length > 0}>
          <p>Click to open file:</p>
        </Show>
        <For each={store.args.dir} fallback={<Empty />}>
          {(path) => <FileLink path={path} />}
        </For>
      </Content>
    </Scroll>
  )
}
