import {For, Show, createSignal} from 'solid-js'
import {format} from 'date-fns'
import {Version, useState} from '@/state'
import {ButtonGroup, Button, ButtonPrimary} from '@/components/Button'
import {Icon} from '@/components/Icon'
import {Drawer, Label, Link, Sub} from './Style'

interface Props {
  onBack: () => void
}

export const ChangeSet = (props: Props) => {
  const {changeSetService, fileService} = useState()
  const versions = () => fileService.currentFile?.versions ?? []
  const [active, setActive] = createSignal<Version>()

  const renderVersion = (version: Version) => {
    if (active() != version) {
      setActive(version)
      changeSetService.renderVersion(version)
    } else {
      setActive(undefined)
      changeSetService.unrenderVersion()
    }
  }

  const applyVersion = () => {
    const version = active()
    if (!version) return
    changeSetService.applyVersion(version)
    setActive(undefined)
  }

  const onBack = () => {
    const currentFile = fileService.currentFile
    changeSetService.unrenderVersion()
    currentFile?.editorView?.focus()
    props.onBack()
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Change Set</Label>
      <Sub data-tauri-drag-region="true">
        <For each={versions()} fallback={<p>No snapshots yet</p>}>
          {(version) => (
            <Link onClick={() => renderVersion(version)}>
              {format(version.date, 'dd MMMM HH:mm:ss')}
              {version.date === active()?.date && ' ✅'}
            </Link>
          )}
        </For>
      </Sub>
      <ButtonGroup>
        <Button onClick={onBack}>
          <Icon>arrow_back</Icon> Back
        </Button>
        <Show when={active() === undefined}>
          <ButtonPrimary onClick={() => changeSetService.addVersion()}>
            Create Snapshot
          </ButtonPrimary>
        </Show>
        <Show when={active() !== undefined}>
          <ButtonPrimary onClick={() => applyVersion()}>Apply Snapshot</ButtonPrimary>
        </Show>
      </ButtonGroup>
    </Drawer>
  )
}
