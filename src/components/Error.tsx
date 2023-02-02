import {Show, Switch, Match} from 'solid-js'
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

export default () => {
  const [store] = useState()
  return (
    <Switch fallback={<Other />}>
      <Match when={store.error.id === 'invalid_state'}>
        <InvalidState title="Invalid State" />
      </Match>
      <Match when={store.error.id === 'invalid_config'}>
        <InvalidState title="Invalid Config" />
      </Match>
      <Match when={store.error.id === 'invalid_file'}>
        <InvalidState title="Invalid File" />
      </Match>
    </Switch>
  )
}

const InvalidState = (props: {title: string}) => {
  const [store, ctrl] = useState()
  const onClick = () => ctrl.clean()

  return (
    <Scroll>
      <Content config={store.config} data-tauri-drag-region="true">
        <h1>{props.title}</h1>
        <p>
          There is an error with the editor state. This is probably due to an
          old version in which the data structure has changed. Automatic data
          migrations may be supported in the future. To fix this now, you can
          copy important notes from below, clean the state and paste it again.
        </p>
        <Pre>
          <code>{JSON.stringify(store.error.props)}</code>
        </Pre>
        <ButtonPrimary onClick={onClick}>Clean</ButtonPrimary>
      </Content>
    </Scroll>
  )
}

const Other = () => {
  const [store, ctrl] = useState()
  const onReload = () => {
    window.location.reload()
  }

  const onDiscard = () => {
    ctrl.discard()
  }

  const getMessage = () => {
    const err = (store.error.props as any).error
    return (typeof err === 'string') ? err : err.message
  }

  return (
    <Scroll data-tauri-drag-region="true">
      <Content config={store.config} data-tauri-drag-region="true">
        <h1>An error occurred.</h1>
        <Pre><code>{getMessage()}</code></Pre>
        <ButtonGroup>
          <ButtonPrimary onClick={onReload}>Reload</ButtonPrimary>
          <Show when={store.error.id === 'exception'}>
            <Button onClick={onDiscard}>Discard</Button>
          </Show>
        </ButtonGroup>
      </Content>
    </Scroll>
  )
}
