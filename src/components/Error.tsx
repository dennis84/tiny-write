import {Show, Switch, Match} from 'solid-js'
import {css} from '@emotion/css'
import {useState} from '@/state'
import {ButtonGroup, button, buttonPrimary} from './Button'
import {Content, Scroll} from './Layout'

const pre = () => css`
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
    <Scroll config={store.config}>
      <Content config={store.config}>
        <h1>{props.title}</h1>
        <p>
          There is an error with the editor state. This is probably due to an
          old version in which the data structure has changed. Automatic data
          migrations may be supported in the future. To fix this now, you can
          copy important notes from below, clean the state and paste it again.
        </p>
        <pre class={pre()}>
          <code>{JSON.stringify(store.error.props)}</code>
        </pre>
        <button class={buttonPrimary()} onClick={onClick}>Clean</button>
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
    <Scroll config={store.config}>
      <Content config={store.config}>
        <h1>An error occurred.</h1>
        <pre class={pre()}><code>{getMessage()}</code></pre>
        <ButtonGroup config={store.config}>
          <button class={buttonPrimary()} onClick={onReload}>Reload</button>
          <Show when={store.error.id === 'exception'}>
            <button class={button()} onClick={onDiscard}>Discard</button>
          </Show>
        </ButtonGroup>
      </Content>
    </Scroll>
  )
}
