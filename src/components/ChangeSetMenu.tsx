import {For, Show, createSignal, onMount} from 'solid-js'
import {format} from 'date-fns'
import {css} from '@emotion/css'
import {Version, useState} from '../state'
import {Off, Label, Link, Sub} from './Menu'
import {button, buttonPrimary} from './Button'
import {Styled} from './Layout'

interface Props {
  onBack: () => void;
}

export const ButtonGroup = (props: Styled) => (
  <div class={css`
    > button {
      margin-right: 10px;
    }
  `}>{props.children}</div>
)

export const ChangeSetMenu = (props: Props) => {
  const [store, ctrl] = useState()

  const getVersions = () =>
    store.collab.ydoc.getArray('versions').toArray() as Version[]

  const [versions, setVersions] = createSignal(getVersions())
  const [active, setActive] = createSignal<Version>()

  onMount(() => {
    store.collab.ydoc.getArray('versions').observe(() => {
      setVersions(getVersions())
    })
  })

  const renderVersion = (version) => {
    setActive(version)
    ctrl.renderVersion(version)
  }

  const applyVersion = () => {
    const version = active()
    if (!version) return
    ctrl.applyVersion(version)
    setActive(undefined)
    setVersions(getVersions())
  }

  const onBack = () => {
    ctrl.unrenderVersion()
    store.editorView.focus()
    props.onBack()
  }

  return (
    <Off
      config={store.config}
      onClick={() => store.editorView.focus()}
      data-tauri-drag-region="true">
      <div>
        <Label config={store.config}>Change Set</Label>
        <Sub>
          <For each={versions()}>
            {(version) => (
              <Link
                config={store.config}
                onClick={() => renderVersion(version)}>
                {format(version.date, 'dd MMMM HH:mm:ss')}
                {version.date === active()?.date && ' ✅'}
              </Link>
            )}
          </For>
        </Sub>
        <ButtonGroup config={store.config}>
          <button
            class={button(store.config)}
            onClick={onBack}>
            ↩ Back
          </button>
          <Show when={active() === undefined}>
            <button
              class={buttonPrimary(store.config)}
              onClick={() => ctrl.addVersion()}>
              Create Snapshot
            </button>
          </Show>
          <Show when={active() !== undefined}>
            <button
              class={buttonPrimary(store.config)}
              onClick={() => applyVersion()}>
              Apply Snapshot
            </button>
          </Show>
        </ButtonGroup>
      </div>
    </Off>
  )
}
