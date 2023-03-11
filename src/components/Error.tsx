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
  return <GeneralError />
}

const GeneralError = () => {
  const [store, ctrl] = useState()
  const onReload = () => {
    window.location.reload()
  }

  const onDiscard = () => {
    ctrl.discard()
  }

  const onReset = () => {
    ctrl.reset()
  }

  const getMessage = () => {
    const err = (store.error?.props as any).error
    return (typeof err === 'string') ? err : err.message
  }

  return (
    <Scroll data-tauri-drag-region="true">
      <Content config={store.config} data-tauri-drag-region="true">
        <h1>An error occurred.</h1>
        <Pre><code>{getMessage()}</code></Pre>
        <ButtonGroup>
          <ButtonPrimary onClick={onReload}>Reload</ButtonPrimary>
          <Button onClick={onDiscard}>Discard current file</Button>
          <Button onClick={onReset}>Reset</Button>
        </ButtonGroup>
      </Content>
    </Scroll>
  )
}
