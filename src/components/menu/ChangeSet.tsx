import {For, Show, createSignal} from 'solid-js'
import {format} from 'date-fns'
import {Version, useState} from '@/state'
import {Drawer, Label, Link, Sub} from './Menu'
import {ButtonGroup, Button, ButtonPrimary} from '@/components/Button'

interface Props {
  onBack: () => void;
}

export const ChangeSet = (props: Props) => {
  const [, ctrl] = useState()
  const versions = () => ctrl.file.currentFile?.versions ?? []
  const [active, setActive] = createSignal<Version>()

  const renderVersion = (version: Version) => {
    if (active() != version) {
      setActive(version)
      ctrl.changeSet.renderVersion(version)
    } else  {
      setActive(undefined)
      ctrl.changeSet.unrenderVersion()
    }
  }

  const applyVersion = () => {
    const version = active()
    if (!version) return
    ctrl.changeSet.applyVersion(version)
    setActive(undefined)
  }

  const onBack = () => {
    const currentFile = ctrl.file.currentFile
    ctrl.changeSet.unrenderVersion()
    currentFile?.editorView?.focus()
    props.onBack()
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Change Set</Label>
      <Sub data-tauri-drag-region="true">
        <For each={versions()} fallback={<p>No snapshots yet</p>}>
          {(version) => (
            <Link
              onClick={() => renderVersion(version)}>
              {format(version.date, 'dd MMMM HH:mm:ss')}
              {version.date === active()?.date && ' ✅'}
            </Link>
          )}
        </For>
      </Sub>
      <ButtonGroup>
        <Button onClick={onBack}>↩ Back</Button>
        <Show when={active() === undefined}>
          <ButtonPrimary onClick={() => ctrl.changeSet.addVersion()}>
            Create Snapshot
          </ButtonPrimary>
        </Show>
        <Show when={active() !== undefined}>
          <ButtonPrimary onClick={() => applyVersion()}>
            Apply Snapshot
          </ButtonPrimary>
        </Show>
      </ButtonGroup>
    </Drawer>
  )
}
