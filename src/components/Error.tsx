import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Mode, useState} from '@/state'
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

  const onDeleteFile = async () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile) return
    await ctrl.file.deleteForever(currentFile.id)
    window.location.reload()
  }

  const onDeleteCanvas = async () => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    await ctrl.canvas.deleteForever(currentCanvas.id)
    window.location.reload()
  }

  const onReset = async () => {
    await ctrl.app.reset()
    window.location.reload()
  }

  const getMessage = () =>
    typeof store.error?.error === 'string'
      ? store.error?.error
      : store.error?.error?.message

  return (
    <Scroll data-tauri-drag-region="true">
      <Content config={store.config} data-tauri-drag-region="true">
        <h1>An error occurred.</h1>
        <Pre><code>{getMessage()}</code></Pre>
        <ButtonGroup>
          <ButtonPrimary onClick={onReload}>Reload</ButtonPrimary>
          <Show when={store.mode === Mode.Editor}>
            <Button onClick={onDeleteFile}>Delete current file</Button>
          </Show>
          <Show when={store.mode === Mode.Canvas}>
            <Button onClick={onDeleteCanvas}>Delete current canvas</Button>
          </Show>
          <Button onClick={onReset}>Reset All</Button>
        </ButtonGroup>
      </Content>
    </Scroll>
  )
}
