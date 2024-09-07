import {Match, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {ButtonGroup, Button, ButtonPrimary} from './Button'
import {Content, Scroll} from './Layout'

const Pre = styled('pre')`
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--foreground-10);
  border: 1px solid var(--foreground);
  border-radius: 2px;
  padding: 10px;
`

export const Error = () => {
  const [store] = useState()
  return (
    <Switch fallback={<GeneralError />}>
      <Match when={store.error?.id === 'editor_sync'}>
        <EditorSyncError />
      </Match>
    </Switch>
  )
}

const GeneralError = () => {
  const [store, ctrl] = useState()
  const onReload = () => {
    window.location.reload()
  }

  const onDeleteFile = async () => {
    if (!store.error?.fileId) return
    await ctrl.file.deleteForever(store.error.fileId)
    window.location.reload()
  }

  const getMessage = () =>
    typeof store.error?.error === 'string' ? store.error?.error : store.error?.error?.message

  return (
    <Scroll data-tauri-drag-region="true" data-testid="error">
      <Content config={store.config} data-tauri-drag-region="true">
        <h1>An error occurred.</h1>
        <Pre>
          <code>{getMessage()}</code>
        </Pre>
        <ButtonGroup>
          <ButtonPrimary onClick={onReload}>Reload</ButtonPrimary>
          <Show when={store.error?.fileId}>
            <Button onClick={onDeleteFile}>Delete corrupt file</Button>
          </Show>
        </ButtonGroup>
      </Content>
    </Scroll>
  )
}

const EditorSyncError = () => {
  const [store] = useState()
  const onReload = () => {
    window.location.reload()
  }

  return (
    <Scroll data-tauri-drag-region="true" data-testid="sync_error">
      <Content config={store.config} data-tauri-drag-region="true">
        <h1>Sync error occurred. Please reload, sorry 😢</h1>
        <ButtonGroup>
          <ButtonPrimary onClick={onReload}>Reload</ButtonPrimary>
        </ButtonGroup>
      </Content>
    </Scroll>
  )
}
