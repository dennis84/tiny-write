import {For, Show, splitProps} from 'solid-js'
import {css} from '@emotion/css'
import {useState} from '@/state'
import {Content, Scroll, Styled} from './Layout'
import {ButtonPrimary} from './Button'

const Link = (props: Styled) => {
  const [local, others] = splitProps(props, ['config', 'children'])
  return (
    <a
      {...others}
      class={css`
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
      `}
    >{local.children}</a>
  )
}

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
      <Link
        config={store.config}
        onClick={onClick}>
        {props.path}
      </Link>
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
    <Scroll config={store.config}
      data-testid="content"
      data-tauri-drag-region="true">
      <Content config={store.config}>
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
