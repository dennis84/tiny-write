import {For, Show, createSignal, onMount} from 'solid-js'
import {format} from 'date-fns'
import {Version, useState} from '@/state'
import {Drawer, Label, Link, Sub} from './Menu'
import {ButtonGroup, button, buttonPrimary} from './Button'

interface Props {
  onBack: () => void;
}

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

  const renderVersion = (version: Version) => {
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
    <Drawer config={store.config}>
      <Label config={store.config}>Change Set</Label>
      <Sub>
        <For each={versions()} fallback={<p>No snapshots yet</p>}>
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
          class={button()}
          onClick={onBack}>
          ↩ Back
        </button>
        <Show when={active() === undefined}>
          <button
            class={buttonPrimary()}
            onClick={() => ctrl.addVersion()}>
            Create Snapshot
          </button>
        </Show>
        <Show when={active() !== undefined}>
          <button
            class={buttonPrimary()}
            onClick={() => applyVersion()}>
            Apply Snapshot
          </button>
        </Show>
      </ButtonGroup>
    </Drawer>
  )
}
